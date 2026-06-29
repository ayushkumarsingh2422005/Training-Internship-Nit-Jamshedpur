"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getQuestionElapsed, upsertQuestionTiming, type QuestionTiming } from "@/lib/exam-utils";

type ExamEngineProps = {
  studentHash: string;
  secureToken: string;
};

type ExamQuestion = {
  _id: string;
  questionType: string;
  questionText: string;
  options: { _id: string; text: string }[];
  marks: number;
  negativeMarks: number;
  timeLimitSeconds: number;
  type?: string;
};

function isFullscreenActive() {
  return !!(
    document.fullscreenElement ||
    (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement
  );
}

export function ExamEngine({ studentHash, secureToken }: ExamEngineProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autostart = searchParams.get("autostart") === "1";

  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<any>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const [questionTimings, setQuestionTimings] = useState<QuestionTiming[]>([]);
  const [isExamActive, setIsExamActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [proctorStats, setProctorStats] = useState({ tabSwitches: 0, focusLosses: 0 });
  const [showAutostartPrompt, setShowAutostartPrompt] = useState(false);

  const startBtnRef = useRef<HTMLButtonElement>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionSessionStartRef = useRef<number>(Date.now());
  const answersRef = useRef<Record<string, unknown>>({});
  const currentQIndexRef = useRef(0);
  const questionTimingsRef = useRef<QuestionTiming[]>([]);
  const autostartHandledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  answersRef.current = answers;
  currentQIndexRef.current = currentQIndex;
  questionTimingsRef.current = questionTimings;

  const syncToServer = useCallback(
    async (
      payload: {
        answers?: Record<string, unknown>;
        currentQuestionIndex?: number;
        questionTimings?: QuestionTiming[];
        event?: "answer" | "tab_switch" | "focus_loss" | "heartbeat" | "question_nav";
      } = {},
    ) => {
      try {
        const res = await fetch("/api/student/tests/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentHash,
            secureToken,
            answers: payload.answers,
            currentQuestionIndex: payload.currentQuestionIndex,
            questionTimings: payload.questionTimings,
            event: payload.event,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setProctorStats({
            tabSwitches: data.tabSwitches ?? 0,
            focusLosses: data.focusLosses ?? 0,
          });
        }
      } catch (err) {
        console.error("Sync failed", err);
      }
    },
    [studentHash, secureToken],
  );

  const scheduleSync = useCallback(
    (payload: Parameters<typeof syncToServer>[0]) => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => syncToServer(payload), 1500);
    },
    [syncToServer],
  );

  const flushQuestionTime = useCallback(
    (qId: string, limitSeconds: number) => {
      if (limitSeconds <= 0) return questionTimingsRef.current;
      const sessionElapsed = Math.floor((Date.now() - questionSessionStartRef.current) / 1000);
      const prevElapsed = getQuestionElapsed(questionTimingsRef.current, qId);
      const total = prevElapsed + sessionElapsed;
      const updated = upsertQuestionTiming(questionTimingsRef.current, qId, total);
      setQuestionTimings(updated);
      return updated;
    },
    [],
  );

  const goToQuestion = useCallback(
    (nextIndex: number) => {
      const currentQ = questions[currentQIndexRef.current];
      let timings = questionTimingsRef.current;
      if (currentQ?.timeLimitSeconds > 0) {
        timings = flushQuestionTime(currentQ._id, currentQ.timeLimitSeconds);
      }

      setCurrentQIndex(nextIndex);
      syncToServer({
        currentQuestionIndex: nextIndex,
        questionTimings: timings,
        answers: answersRef.current,
        event: "question_nav",
      });

      const nextQ = questions[nextIndex];
      if (nextQ?.timeLimitSeconds > 0) {
        const elapsed = getQuestionElapsed(timings, nextQ._id);
        setQuestionTimeLeft(Math.max(0, nextQ.timeLimitSeconds - elapsed));
        questionSessionStartRef.current = Date.now();
      } else {
        setQuestionTimeLeft(null);
      }
    },
    [questions, flushQuestionTime, syncToServer],
  );

  const activateExam = useCallback(() => {
    setIsExamActive(true);
    if (testData?._id) {
      localStorage.setItem(`exam_active_${testData._id}_${studentHash}`, "true");
    }
    questionSessionStartRef.current = Date.now();
    syncToServer({
      answers: answersRef.current,
      currentQuestionIndex: currentQIndexRef.current,
      event: "heartbeat",
    });
  }, [testData, studentHash, syncToServer]);

  const enterFullscreen = useCallback(async () => {
    setShowAutostartPrompt(false);

    try {
      const elem = document.documentElement as HTMLElement & {
        requestFullscreen?: (options?: FullscreenOptions) => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void>;
      };

      if (elem.requestFullscreen) {
        await elem.requestFullscreen({ navigationUI: "hide" });
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else {
        alert(
          "Your browser does not support full-screen mode. The exam will continue in windowed mode.",
        );
        setIsFullscreen(true);
        activateExam();
        return;
      }

      setIsFullscreen(isFullscreenActive());
      activateExam();
    } catch (err) {
      console.error("Error entering fullscreen:", err);
      alert(
        "Could not enter full-screen mode. Please click the button again and allow full-screen when prompted.",
      );
    }
  }, [activateExam]);

  useEffect(() => {
    async function loadExam() {
      try {
        const res = await fetch(
          `/api/student/tests/exam-data?studentHash=${studentHash}&secureToken=${secureToken}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load exam.");

        setTestData(data.test);
        setQuestions(
          data.questions.map((q: ExamQuestion) => ({ ...q, type: q.questionType })),
        );
        setTimeLeft(data.timeLeftSeconds);
        setQuestionTimings(data.questionTimings ?? []);
        setProctorStats({
          tabSwitches: data.tabSwitches ?? 0,
          focusLosses: data.focusLosses ?? 0,
        });

        const testId = data.test._id;
        const activeKey = `exam_active_${testId}_${studentHash}`;
        const savedActive = localStorage.getItem(activeKey);
        if (savedActive === "true") setIsExamActive(true);

        const answersKey = `exam_answers_${testId}_${studentHash}`;
        const savedAnswers = localStorage.getItem(answersKey);
        let localAnswers: Record<string, unknown> = {};
        if (savedAnswers) {
          try {
            localAnswers = JSON.parse(savedAnswers);
          } catch {
            /* ignore */
          }
        }

        const mergedAnswers = { ...(data.answersDraft ?? {}), ...localAnswers };
        setAnswers(mergedAnswers);

        const qIndexKey = `exam_qindex_${testId}_${studentHash}`;
        const savedQIndex = localStorage.getItem(qIndexKey);
        const qIndex =
          savedQIndex !== null ? Number(savedQIndex) : (data.currentQuestionIndex ?? 0);
        setCurrentQIndex(qIndex);

        const initialQ = data.questions[qIndex];
        if (initialQ?.timeLimitSeconds > 0) {
          const elapsed = getQuestionElapsed(data.questionTimings ?? [], initialQ._id);
          setQuestionTimeLeft(Math.max(0, initialQ.timeLimitSeconds - elapsed));
          questionSessionStartRef.current = Date.now();
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load exam.");
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [studentHash, secureToken]);

  useEffect(() => {
    if (!testData?._id) return;
    localStorage.setItem(`exam_answers_${testData._id}_${studentHash}`, JSON.stringify(answers));
    scheduleSync({ answers, currentQuestionIndex: currentQIndex, questionTimings, event: "answer" });
  }, [answers, testData, studentHash, currentQIndex, questionTimings, scheduleSync]);

  useEffect(() => {
    if (!testData?._id) return;
    localStorage.setItem(`exam_qindex_${testData._id}_${studentHash}`, currentQIndex.toString());
  }, [currentQIndex, testData, studentHash]);

  useEffect(() => {
    if (loading || timeLeft <= 0 || !isExamActive) return;
    const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [loading, timeLeft, isExamActive]);

  useEffect(() => {
    if (!isExamActive) return;

    questionSessionStartRef.current = Date.now();
    const currentQ = questions[currentQIndex];
    if (!currentQ || currentQ.timeLimitSeconds <= 0) {
      setQuestionTimeLeft(null);
      return;
    }

    const elapsed = getQuestionElapsed(questionTimingsRef.current, currentQ._id);
    setQuestionTimeLeft(Math.max(0, currentQ.timeLimitSeconds - elapsed));

    const timerId = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isExamActive, currentQIndex, questions]);

  useEffect(() => {
    if (!isExamActive || questionTimeLeft !== 0) return;
    const currentQ = questions[currentQIndex];
    if (!currentQ || currentQ.timeLimitSeconds <= 0) return;

    if (currentQIndex < questions.length - 1) {
      goToQuestion(currentQIndex + 1);
    } else {
      alert("Time limit reached for the last question.");
      const timings = flushQuestionTime(currentQ._id, currentQ.timeLimitSeconds);
      syncToServer({ questionTimings: timings, answers: answersRef.current, event: "question_nav" });
      setQuestionTimeLeft(null);
    }
  }, [questionTimeLeft, isExamActive, currentQIndex, questions, goToQuestion, flushQuestionTime, syncToServer]);

  const submitTest = useCallback(
    async (force = false) => {
      if (!force && !window.confirm("Are you sure you want to submit the test?")) return;
      try {
        const currentQ = questions[currentQIndexRef.current];
        let timings = questionTimingsRef.current;
        if (currentQ?.timeLimitSeconds > 0) {
          timings = flushQuestionTime(currentQ._id, currentQ.timeLimitSeconds);
        }
        await syncToServer({ answers: answersRef.current, questionTimings: timings, event: "heartbeat" });

        const res = await fetch("/api/student/tests/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentHash, secureToken, answers: answersRef.current }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to submit exam.");

        if (testData?._id) {
          localStorage.removeItem(`exam_active_${testData._id}_${studentHash}`);
          localStorage.removeItem(`exam_answers_${testData._id}_${studentHash}`);
          localStorage.removeItem(`exam_qindex_${testData._id}_${studentHash}`);
        }

        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => undefined);
        }

        alert(
          `Test Submitted successfully!\nScore: ${data.result.totalScore}\nCorrect: ${data.result.correctQuestions}\nIncorrect: ${data.result.incorrectQuestions}`,
        );
        setIsExamActive(false);
        setTimeout(() => router.push("/student-portal"), 100);
      } catch (err: unknown) {
        alert("Submission Error: " + (err instanceof Error ? err.message : "Unknown error"));
      }
    },
    [questions, flushQuestionTime, syncToServer, studentHash, secureToken, testData, router],
  );

  useEffect(() => {
    if (!loading && timeLeft <= 0 && isExamActive) {
      alert("Time has expired! Submitting test automatically.");
      submitTest(true);
    }
  }, [timeLeft, loading, isExamActive, submitTest]);

  useEffect(() => {
    const handleFsChange = () => {
      const active = isFullscreenActive();
      setIsFullscreen(active);
      if (!active && isExamActive) {
        syncToServer({ answers: answersRef.current, event: "focus_loss" });
      }
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, [isExamActive, syncToServer]);

  useEffect(() => {
    if (!isExamActive) return;

    const handleVisibility = () => {
      if (document.hidden) {
        syncToServer({ answers: answersRef.current, event: "tab_switch" });
      }
    };

    const handleBlur = () => {
      if (!isFullscreenActive()) return;
      syncToServer({ answers: answersRef.current, event: "focus_loss" });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isExamActive, syncToServer]);

  useEffect(() => {
    if (!isExamActive) return;
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      alert("Warning: Navigating back is disabled during the exam.");
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isExamActive]);

  useEffect(() => {
    if (!isExamActive) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const msg = "Are you sure you want to exit the exam? Your progress is saved on the server.";
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isExamActive]);

  useEffect(() => {
    if (!isExamActive) return;
    const heartbeat = setInterval(() => {
      syncToServer({
        answers: answersRef.current,
        currentQuestionIndex: currentQIndexRef.current,
        questionTimings: questionTimingsRef.current,
        event: "heartbeat",
      });
    }, 30000);
    return () => clearInterval(heartbeat);
  }, [isExamActive, syncToServer]);

  useEffect(() => {
    if (loading || error || isExamActive || autostartHandledRef.current) return;

    if (autostart) {
      autostartHandledRef.current = true;
      setShowAutostartPrompt(true);
      startBtnRef.current?.focus();
    }
  }, [loading, error, isExamActive, autostart]);

  function handleAnswerChange(qId: string, val: unknown) {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  }

  function formatTime(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  const currentQuestion = questions[currentQIndex];

  if (loading) {
    return (
      <div className="exam-loading">
        <h2>Loading examination…</h2>
        <p style={{ color: "var(--muted)" }}>Please wait while we prepare your secure test environment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="exam-error">
        <h2>Error Loading Exam</h2>
        <p>{error}</p>
        <button type="button" className="btn btn-green" onClick={() => router.push("/student-portal")}>
          Back to Student Portal
        </button>
      </div>
    );
  }

  return (
    <div className={`exam-root${isExamActive ? " exam-root--active" : ""}`}>
      {showAutostartPrompt && !isExamActive && (
        <div className="exam-autostart-overlay">
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Enter Secure Exam Mode</h2>
          <p>
            Tap the button below to start your exam in full-screen mode. This is required for a fair and
            proctored examination.
          </p>
          <button
            ref={startBtnRef}
            type="button"
            className="exam-start-btn"
            style={{ width: "auto", minWidth: "260px" }}
            onClick={() => void enterFullscreen()}
          >
            Start Exam in Full Screen
          </button>
        </div>
      )}

      {!isExamActive && !showAutostartPrompt ? (
        <div className="exam-start">
          <div className="exam-start-card">
            <h2>{testData.testName}</h2>
            <div className="exam-start-meta">
              <div className="exam-start-meta-item">
                <span>Duration</span>
                <strong>{testData.durationMinutes} minutes</strong>
              </div>
              <div className="exam-start-meta-item">
                <span>Negative marking</span>
                <strong style={{ color: testData.isNegativeMarking ? "#c62828" : "var(--green-dark)" }}>
                  {testData.isNegativeMarking ? "Yes" : "No"}
                </strong>
              </div>
            </div>
            {testData.randomizeQuestions && (
              <p className="exam-start-note">
                Questions appear in a randomized order unique to your session.
              </p>
            )}
            <div className="exam-start-guidelines">
              <h4>Important guidelines</h4>
              <p>
                {testData.instructions ||
                  "This test runs in secure full-screen mode. Tab switches and focus losses are recorded. Your answers sync to the server automatically."}
              </p>
            </div>
            <button
              ref={startBtnRef}
              type="button"
              className="exam-start-btn"
              onClick={() => void enterFullscreen()}
            >
              Start Exam &amp; Enter Full Screen
            </button>
          </div>
        </div>
      ) : null}

      {isExamActive ? (
        <>
          {!isFullscreen && (
            <div className="exam-pause-overlay">
              <h2>Exam paused — full screen required</h2>
              <p>
                Full-screen mode is required to continue. Your progress is saved on the server. Resume
                full screen to continue the exam.
              </p>
              <button type="button" className="exam-start-btn" style={{ width: "auto" }} onClick={() => void enterFullscreen()}>
                Resume Full Screen
              </button>
            </div>
          )}

          <header className="exam-header">
            <div>
              <h1>{testData.testName}</h1>
              <span className="exam-header-meta">
                Tab switches: {proctorStats.tabSwitches} | Focus losses: {proctorStats.focusLosses}
              </span>
            </div>
            <div className="exam-header-actions">
              {questionTimeLeft !== null && currentQuestion?.timeLimitSeconds > 0 && (
                <div
                  className={`exam-q-timer${questionTimeLeft <= 10 ? " exam-q-timer--urgent" : ""}`}
                >
                  Q timer: {formatTime(questionTimeLeft)}
                </div>
              )}
              <div className="exam-timer">{formatTime(timeLeft)}</div>
              <button type="button" className="exam-finish-btn" onClick={() => submitTest(false)}>
                Finish exam
              </button>
            </div>
          </header>

          <div className="exam-body">
            <div className="exam-main">
              <div className="exam-question-card">
                <div className="exam-question-head">
                  <h2>Question {currentQIndex + 1}</h2>
                  <div className="exam-question-badges">
                    {currentQuestion?.timeLimitSeconds > 0 && (
                      <span className="exam-badge exam-badge--warn">
                        Limit: {currentQuestion.timeLimitSeconds}s
                      </span>
                    )}
                    <span className="exam-badge">{currentQuestion?.type}</span>
                  </div>
                </div>

                <div className="exam-question-text">{currentQuestion?.questionText}</div>

                <div className="exam-options">
                  {currentQuestion?.type === "Single Correct" &&
                    currentQuestion.options.map((opt) => (
                      <label
                        key={opt._id}
                        className={`exam-option${answers[currentQuestion._id] === opt._id ? " exam-option--selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name={currentQuestion._id}
                          checked={answers[currentQuestion._id] === opt._id}
                          onChange={() => handleAnswerChange(currentQuestion._id, opt._id)}
                        />
                        <span>{opt.text}</span>
                      </label>
                    ))}

                  {currentQuestion?.type === "Multiple Correct" &&
                    currentQuestion.options.map((opt) => {
                      const selected = answers[currentQuestion._id] as string[] | undefined;
                      const isChecked = selected?.includes(opt._id);
                      return (
                        <label
                          key={opt._id}
                          className={`exam-option${isChecked ? " exam-option--selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked || false}
                            onChange={(e) => {
                              const prev = (answers[currentQuestion._id] as string[]) || [];
                              handleAnswerChange(
                                currentQuestion._id,
                                e.target.checked
                                  ? [...prev, opt._id]
                                  : prev.filter((id) => id !== opt._id),
                              );
                            }}
                          />
                          <span>{opt.text}</span>
                        </label>
                      );
                    })}

                  {currentQuestion?.type === "Integer Type" && (
                    <input
                      type="number"
                      className="exam-integer-input"
                      value={(answers[currentQuestion._id] as string) || ""}
                      onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                      placeholder="Enter your numeric answer…"
                    />
                  )}
                </div>
              </div>

              <div className="exam-nav-row">
                <button
                  type="button"
                  className="exam-nav-btn"
                  onClick={() => goToQuestion(Math.max(0, currentQIndex - 1))}
                  disabled={currentQIndex === 0}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className="exam-nav-btn"
                  onClick={() => goToQuestion(Math.min(questions.length - 1, currentQIndex + 1))}
                  disabled={currentQIndex === questions.length - 1}
                >
                  Next →
                </button>
              </div>
            </div>

            <aside className="exam-palette">
              <div className="exam-palette-head">
                <h3>Question palette</h3>
                <div className="exam-palette-legend">
                  <span>
                    <span className="exam-palette-dot exam-palette-dot--answered" aria-hidden />
                    Answered
                  </span>
                  <span>
                    <span className="exam-palette-dot exam-palette-dot--unanswered" aria-hidden />
                    Unanswered
                  </span>
                </div>
              </div>
              <div className="exam-palette-grid">
                {questions.map((q, idx) => {
                  const ans = answers[q._id];
                  const isAnswered =
                    ans !== undefined && ans !== "" && (!Array.isArray(ans) || ans.length > 0);
                  return (
                    <button
                      key={q._id}
                      type="button"
                      onClick={() => goToQuestion(idx)}
                      className={`exam-palette-btn${isAnswered ? " exam-palette-btn--answered" : ""}${currentQIndex === idx ? " exam-palette-btn--current" : ""}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}
