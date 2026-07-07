"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getQuestionElapsed,
  getQuestionRemainingSeconds,
  isQuestionTimeExpired,
  upsertQuestionTiming,
  type QuestionTiming,
  shouldBlockExamShortcut,
} from "@/lib/exam-utils";
import { authHeaders } from "@/lib/teacher-session-client";
import { computePreviewScore, type GradingQuestion } from "@/lib/exam-preview-score";
import {
  loadDraftPreview,
  normalizeDraftPreviewQuestions,
} from "@/lib/teacher-exam-preview";
import { ExamEntryScreen } from "@/components/ExamEntryScreen";
import { ExamResultScreen } from "@/components/ExamResultScreen";
import type { ExamStudentProfile, ExamSubmitResult } from "@/lib/exam-entry-types";

type ExamEngineProps = {
  studentHash?: string;
  secureToken?: string;
  previewMode?: boolean;
  previewTestId?: string | null;
  previewDraft?: boolean;
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

type SubmitResult = ExamSubmitResult;

function isFullscreenActive() {
  return !!(
    document.fullscreenElement ||
    (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement
  );
}

export function ExamEngine({
  studentHash,
  secureToken,
  previewMode = false,
  previewTestId = null,
  previewDraft = false,
}: ExamEngineProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autostart = !previewMode && searchParams.get("autostart") === "1";
  const isPreview = previewMode;
  const previewScope = previewTestId || "draft";

  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<any>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const [showTestElapsed, setShowTestElapsed] = useState(false);
  const [showQuestionElapsed, setShowQuestionElapsed] = useState(false);
  const [questionTimings, setQuestionTimings] = useState<QuestionTiming[]>([]);
  const [isExamActive, setIsExamActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [proctorStats, setProctorStats] = useState({ tabSwitches: 0, focusLosses: 0 });
  const [studentProfile, setStudentProfile] = useState<ExamStudentProfile | null>(null);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [submitResultModal, setSubmitResultModal] = useState<SubmitResult | null>(null);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startBtnRef = useRef<HTMLButtonElement>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialTimeLeftRef = useRef(0);
  const questionSessionStartRef = useRef<number>(Date.now());
  const answersRef = useRef<Record<string, unknown>>({});
  const currentQIndexRef = useRef(0);
  const questionTimingsRef = useRef<QuestionTiming[]>([]);
  const questionExpiryHandledRef = useRef<Set<string>>(new Set());
  const autoSubmitTriggeredRef = useRef(false);
  const gradingQuestionsRef = useRef<GradingQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getStorageScope = useCallback(() => {
    if (isPreview) return `preview_${previewScope}`;
    return `${testData?._id}_${studentHash}`;
  }, [isPreview, previewScope, testData?._id, studentHash]);

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
      if (isPreview) {
        if (payload.event === "tab_switch") {
          setProctorStats((prev) => ({ ...prev, tabSwitches: prev.tabSwitches + 1 }));
        } else if (payload.event === "focus_loss") {
          setProctorStats((prev) => ({ ...prev, focusLosses: prev.focusLosses + 1 }));
        }
        return;
      }
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
    [isPreview, studentHash, secureToken],
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
      const total = Math.min(prevElapsed + sessionElapsed, limitSeconds);
      const updated = upsertQuestionTiming(questionTimingsRef.current, qId, total);
      questionTimingsRef.current = updated;
      setQuestionTimings(updated);
      return updated;
    },
    [],
  );

  const isQuestionExpired = useCallback(
    (q: ExamQuestion, timings: QuestionTiming[] = questionTimingsRef.current) =>
      isQuestionTimeExpired(q.timeLimitSeconds, timings, q._id),
    [],
  );

  const findNavigableIndex = useCallback(
    (fromIndex: number, direction: -1 | 1, timings: QuestionTiming[] = questionTimingsRef.current) => {
      let index = fromIndex + direction;
      while (index >= 0 && index < questions.length) {
        if (!isQuestionExpired(questions[index], timings)) return index;
        index += direction;
      }
      return null;
    },
    [questions, isQuestionExpired],
  );

  const goToQuestion = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= questions.length) return;

      const currentQ = questions[currentQIndexRef.current];
      let timings = questionTimingsRef.current;
      if (currentQ?.timeLimitSeconds > 0) {
        timings = flushQuestionTime(currentQ._id, currentQ.timeLimitSeconds);
      }

      const nextQ = questions[nextIndex];
      if (nextQ && isQuestionTimeExpired(nextQ.timeLimitSeconds, timings, nextQ._id)) {
        return;
      }

      if (nextIndex === currentQIndexRef.current) return;

      setCurrentQIndex(nextIndex);
      setShowQuestionElapsed(false);
      syncToServer({
        currentQuestionIndex: nextIndex,
        questionTimings: timings,
        answers: answersRef.current,
        event: "question_nav",
      });

      if (nextQ?.timeLimitSeconds > 0) {
        setQuestionTimeLeft(getQuestionRemainingSeconds(nextQ.timeLimitSeconds, timings, nextQ._id));
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
      localStorage.setItem(`exam_active_${getStorageScope()}`, "true");
    }
    questionSessionStartRef.current = Date.now();
    syncToServer({
      answers: answersRef.current,
      currentQuestionIndex: currentQIndexRef.current,
      event: "heartbeat",
    });
  }, [testData, syncToServer, getStorageScope]);

  const enterFullscreen = useCallback(async () => {
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
        if (isPreview) {
          if (previewDraft) {
            const payload = loadDraftPreview();
            if (!payload) {
              throw new Error("Preview data not found. Return to the teacher dashboard and click Preview again.");
            }
            const { displayQuestions, gradingQuestions } = normalizeDraftPreviewQuestions(
              payload.questions,
              payload.test.randomizeQuestions,
            );
            gradingQuestionsRef.current = gradingQuestions;
            const timeLeftSeconds = payload.test.durationMinutes * 60;
            setTestData({ _id: "preview-draft", ...payload.test });
            setStudentProfile(
              payload.student ?? {
                fullName: "Preview Candidate",
                fatherName: "—",
                internId: "PREVIEW",
                email: "—",
                phoneNumber: "—",
                collegeName: "Preview session",
                schoolName: "—",
                subject: payload.test.subject ?? "—",
                subpart: payload.test.subpart ?? "—",
                rollNumber: null,
              },
            );
            setQuestions(displayQuestions);
            setTimeLeft(timeLeftSeconds);
            initialTimeLeftRef.current = timeLeftSeconds;
            setQuestionTimings([]);
            questionTimingsRef.current = [];
            setAnswers({});
            setCurrentQIndex(0);
            const initialQ = displayQuestions[0];
            if (initialQ?.timeLimitSeconds > 0) {
              setQuestionTimeLeft(initialQ.timeLimitSeconds);
              questionSessionStartRef.current = Date.now();
            }
            return;
          }

          if (!previewTestId) {
            throw new Error("Missing test id for preview.");
          }

          const res = await fetch(`/api/teachers/tests/preview?id=${previewTestId}`, {
            headers: authHeaders(),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to load preview.");

          gradingQuestionsRef.current = data.gradingQuestions ?? [];
          setTestData(data.test);
          setStudentProfile(data.student);
          setQuestions(
            data.questions.map((q: ExamQuestion) => ({ ...q, type: q.questionType })),
          );
          setTimeLeft(data.timeLeftSeconds);
          initialTimeLeftRef.current = data.timeLeftSeconds;
          setQuestionTimings(data.questionTimings ?? []);
          questionTimingsRef.current = data.questionTimings ?? [];
          setAnswers(data.answersDraft ?? {});
          setCurrentQIndex(data.currentQuestionIndex ?? 0);

          const initialQ = data.questions[data.currentQuestionIndex ?? 0];
          if (initialQ?.timeLimitSeconds > 0) {
            setQuestionTimeLeft(
              getQuestionRemainingSeconds(
                initialQ.timeLimitSeconds,
                data.questionTimings ?? [],
                initialQ._id,
              ),
            );
            questionSessionStartRef.current = Date.now();
          }
          return;
        }

        if (!studentHash || !secureToken) {
          throw new Error("Missing exam credentials.");
        }

        const res = await fetch(
          `/api/student/tests/exam-data?studentHash=${studentHash}&secureToken=${secureToken}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load exam.");

        setTestData(data.test);
        setStudentProfile(data.student);
        setQuestions(
          data.questions.map((q: ExamQuestion) => ({ ...q, type: q.questionType })),
        );
        setTimeLeft(data.timeLeftSeconds);
        initialTimeLeftRef.current = data.timeLeftSeconds;
        setQuestionTimings(data.questionTimings ?? []);
        questionTimingsRef.current = data.questionTimings ?? [];
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
          setQuestionTimeLeft(
            getQuestionRemainingSeconds(
              initialQ.timeLimitSeconds,
              data.questionTimings ?? [],
              initialQ._id,
            ),
          );
          questionSessionStartRef.current = Date.now();
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load exam.");
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [studentHash, secureToken, isPreview, previewDraft, previewTestId]);

  useEffect(() => {
    if (!testData?._id) return;
    const scope = getStorageScope();
    localStorage.setItem(`exam_answers_${scope}`, JSON.stringify(answers));
    scheduleSync({ answers, currentQuestionIndex: currentQIndex, questionTimings, event: "answer" });
  }, [answers, testData, currentQIndex, questionTimings, scheduleSync, getStorageScope]);

  useEffect(() => {
    if (!testData?._id) return;
    localStorage.setItem(`exam_qindex_${getStorageScope()}`, currentQIndex.toString());
  }, [currentQIndex, testData, getStorageScope]);

  useEffect(() => {
    if (loading || timeLeft <= 0 || !isExamActive) return;
    const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [loading, timeLeft, isExamActive]);

  useEffect(() => {
    if (!isExamActive) return;

    const currentQ = questions[currentQIndex];
    if (!currentQ || currentQ.timeLimitSeconds <= 0) {
      setQuestionTimeLeft(null);
      return;
    }

    const storedElapsed = getQuestionElapsed(questionTimingsRef.current, currentQ._id);
    const alreadyExpired =
      questionExpiryHandledRef.current.has(currentQ._id) ||
      storedElapsed >= currentQ.timeLimitSeconds;

    if (!alreadyExpired) {
      questionSessionStartRef.current = Date.now();
    }

    const updateRemaining = () => {
      if (
        questionExpiryHandledRef.current.has(currentQ._id) ||
        getQuestionElapsed(questionTimingsRef.current, currentQ._id) >= currentQ.timeLimitSeconds
      ) {
        setQuestionTimeLeft(0);
        return;
      }

      const remaining = getQuestionRemainingSeconds(
        currentQ.timeLimitSeconds,
        questionTimingsRef.current,
        currentQ._id,
        questionSessionStartRef.current,
      );
      setQuestionTimeLeft(remaining);
    };

    updateRemaining();
    const timerId = setInterval(updateRemaining, 1000);
    return () => clearInterval(timerId);
  }, [isExamActive, currentQIndex, questions]);

  useEffect(() => {
    if (!isExamActive || questionTimeLeft !== 0) return;
    const currentQ = questions[currentQIndex];
    if (!currentQ || currentQ.timeLimitSeconds <= 0) return;
    if (questionExpiryHandledRef.current.has(currentQ._id)) return;

    questionExpiryHandledRef.current.add(currentQ._id);

    const timings = flushQuestionTime(currentQ._id, currentQ.timeLimitSeconds);
    const nextIndex = findNavigableIndex(currentQIndex, 1, timings);

    if (nextIndex !== null && nextIndex !== currentQIndex) {
      goToQuestion(nextIndex);
      return;
    }

    syncToServer({ questionTimings: timings, answers: answersRef.current, event: "question_nav" });
    setQuestionTimeLeft(0);
  }, [
    questionTimeLeft,
    isExamActive,
    currentQIndex,
    questions,
    goToQuestion,
    flushQuestionTime,
    findNavigableIndex,
    syncToServer,
  ]);

  const submitTest = useCallback(
    async (meta?: { autoExpired?: boolean }) => {
      if (isSubmitting) return;

      setIsSubmitting(true);
      setSubmitError(null);
      setShowSubmitConfirmModal(false);

      try {
        const currentQ = questions[currentQIndexRef.current];
        let timings = questionTimingsRef.current;
        if (currentQ?.timeLimitSeconds > 0) {
          timings = flushQuestionTime(currentQ._id, currentQ.timeLimitSeconds);
        }

        if (isPreview) {
          const result = computePreviewScore(
            gradingQuestionsRef.current,
            answersRef.current,
            Boolean(testData?.isNegativeMarking),
          );

          localStorage.removeItem(`exam_active_${getStorageScope()}`);
          localStorage.removeItem(`exam_answers_${getStorageScope()}`);
          localStorage.removeItem(`exam_qindex_${getStorageScope()}`);

          if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => undefined);
          }

          setIsExamActive(false);
          setSubmitResultModal({
            ...result,
            autoSubmitted: meta?.autoExpired ?? false,
          });
          return;
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

        setIsExamActive(false);
        setSubmitResultModal({
          totalScore: data.result.totalScore,
          correctQuestions: data.result.correctQuestions,
          incorrectQuestions: data.result.incorrectQuestions,
          unattemptedQuestions: data.result.unattemptedQuestions,
          accuracyPercentage: data.result.accuracyPercentage,
          autoSubmitted: meta?.autoExpired ?? false,
        });
      } catch (err: unknown) {
        setSubmitError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      questions,
      flushQuestionTime,
      syncToServer,
      studentHash,
      secureToken,
      testData,
      isSubmitting,
      isPreview,
      getStorageScope,
    ],
  );

  function closeSubmitResultModal() {
    setSubmitResultModal(null);
    router.push(isPreview ? "/teacher-portal" : "/student-portal");
  }

  useEffect(() => {
    if (!loading && timeLeft <= 0 && isExamActive && !autoSubmitTriggeredRef.current) {
      autoSubmitTriggeredRef.current = true;
      submitTest({ autoExpired: true });
    }
  }, [timeLeft, loading, isExamActive, submitTest]);

  useEffect(() => {
    if (!isExamActive) return;

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

  const blockExamShortcuts = !loading && !error && !submitResultModal && Boolean(testData);

  useEffect(() => {
    if (!blockExamShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldBlockExamShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [blockExamShortcuts]);

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
    if (!loading && autostart && !isExamActive) {
      startBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [loading, autostart, isExamActive]);

  function handleAnswerChange(qId: string, val: unknown) {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  }

  function formatTime(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function getExamTimerClass(remainingSeconds: number, totalSeconds: number) {
    if (totalSeconds <= 0) return "exam-timer--safe";
    const ratio = remainingSeconds / totalSeconds;
    if (remainingSeconds <= 300 || ratio <= 0.15) return "exam-timer--critical";
    if (remainingSeconds <= 900 || ratio <= 0.35) return "exam-timer--warning";
    return "exam-timer--safe";
  }

  const currentQuestion = questions[currentQIndex];
  const hasPerQuestionTimers = questions.some((q) => q.timeLimitSeconds > 0);
  const prevNavIndex = findNavigableIndex(currentQIndex, -1);
  const nextNavIndex = findNavigableIndex(currentQIndex, 1);
  const currentQuestionLocked =
    hasPerQuestionTimers &&
    !!currentQuestion &&
    currentQuestion.timeLimitSeconds > 0 &&
    (questionTimeLeft === 0 ||
      isQuestionTimeExpired(
        currentQuestion.timeLimitSeconds,
        questionTimings,
        currentQuestion._id,
      ));
  const showEndOfExamNotice =
    hasPerQuestionTimers &&
    currentQuestionLocked &&
    nextNavIndex === null &&
    questionTimeLeft === 0;

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
        <button
          type="button"
          className="btn btn-green"
          onClick={() => router.push(isPreview ? "/teacher-portal" : "/student-portal")}
        >
          {isPreview ? "Back to teacher portal" : "Back to Student Portal"}
        </button>
      </div>
    );
  }

  return (
    <div className={`exam-root${isExamActive ? " exam-root--active" : ""}${isPreview ? " exam-root--preview" : ""}`}>
      {isPreview ? (
        <div className="exam-preview-banner" role="status">
          Teacher preview
        </div>
      ) : null}

      {!isExamActive && submitResultModal && testData && studentProfile ? (
        <ExamResultScreen
          result={submitResultModal}
          testName={testData.testName}
          studentName={studentProfile.fullName}
          isPreview={isPreview}
          onBack={closeSubmitResultModal}
        />
      ) : null}

      {!isExamActive && !submitResultModal && studentProfile && testData ? (
        <ExamEntryScreen
          testData={testData}
          student={studentProfile}
          questionCount={questions.length}
          guidelinesAccepted={guidelinesAccepted}
          onGuidelinesAcceptedChange={setGuidelinesAccepted}
          onStart={() => void enterFullscreen()}
          startButtonRef={startBtnRef}
        />
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
              <button
                type="button"
                className={`exam-timer exam-timer--toggle ${getExamTimerClass(timeLeft, initialTimeLeftRef.current)}`}
                onClick={() => setShowTestElapsed((prev) => !prev)}
                title={showTestElapsed ? "Click to show time remaining" : "Click to show time elapsed"}
              >
                {showTestElapsed
                  ? `Elapsed: ${formatTime(Math.max(0, initialTimeLeftRef.current - timeLeft))}`
                  : `Left: ${formatTime(timeLeft)}`}
              </button>
              <button
                type="button"
                className="exam-finish-btn"
                onClick={() => setShowSubmitConfirmModal(true)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting…" : "Finish exam"}
              </button>
            </div>
          </header>

          <div className="exam-body">
            <div className="exam-main">
              <div className="exam-question-card">
                <div className="exam-question-head">
                  <h2>Question {currentQIndex + 1}</h2>
                  <div className="exam-question-badges">
                    {currentQuestion?.timeLimitSeconds > 0 && questionTimeLeft !== null && (
                      <button
                        type="button"
                        className={`exam-q-timer exam-timer--toggle${questionTimeLeft <= 10 && questionTimeLeft > 0 ? " exam-q-timer--urgent" : ""}`}
                        onClick={() => setShowQuestionElapsed((prev) => !prev)}
                        title={
                          showQuestionElapsed
                            ? "Click to show question time remaining"
                            : "Click to show question time elapsed"
                        }
                      >
                        {showQuestionElapsed
                          ? `Q elapsed: ${formatTime(Math.max(0, currentQuestion.timeLimitSeconds - questionTimeLeft))}`
                          : `Q left: ${formatTime(questionTimeLeft)}`}
                      </button>
                    )}
                    <span className="exam-badge">{currentQuestion?.type}</span>
                  </div>
                </div>

                <div className="exam-question-text">{currentQuestion?.questionText}</div>

                {currentQuestionLocked ? (
                  <p className="exam-question-expired-notice">
                    Time for this question has expired. You cannot change your answer.
                  </p>
                ) : null}

                {showEndOfExamNotice ? (
                  <p className="exam-end-notice">
                    No more questions with time remaining. Review your answers and click{" "}
                    <strong>Finish exam</strong> to submit.
                  </p>
                ) : null}

                <div className={`exam-options${currentQuestionLocked ? " exam-options--locked" : ""}`}>
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
                          disabled={currentQuestionLocked}
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
                            disabled={currentQuestionLocked}
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
                      disabled={currentQuestionLocked}
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
                  onClick={() => prevNavIndex !== null && goToQuestion(prevNavIndex)}
                  disabled={prevNavIndex === null}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className="exam-nav-btn"
                  onClick={() => nextNavIndex !== null && goToQuestion(nextNavIndex)}
                  disabled={nextNavIndex === null}
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
                  {hasPerQuestionTimers ? (
                    <span>
                      <span className="exam-palette-dot exam-palette-dot--expired" aria-hidden />
                      Time expired
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="exam-palette-grid">
                {questions.map((q, idx) => {
                  const ans = answers[q._id];
                  const isAnswered =
                    ans !== undefined && ans !== "" && (!Array.isArray(ans) || ans.length > 0);
                  const isExpired =
                    hasPerQuestionTimers &&
                    isQuestionTimeExpired(q.timeLimitSeconds, questionTimings, q._id);
                  return (
                    <button
                      key={q._id}
                      type="button"
                      onClick={() => !isExpired && goToQuestion(idx)}
                      disabled={isExpired}
                      title={isExpired ? "Time for this question has expired" : undefined}
                      className={`exam-palette-btn${isAnswered ? " exam-palette-btn--answered" : ""}${currentQIndex === idx ? " exam-palette-btn--current" : ""}${isExpired ? " exam-palette-btn--expired" : ""}`}
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

      {showSubmitConfirmModal ? (
        <div
          className="exam-result-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exam-submit-confirm-title"
        >
          <div className="exam-result-modal exam-confirm-modal">
            <h2 id="exam-submit-confirm-title" className="exam-result-title">
              Submit examination?
            </h2>
            <p className="exam-result-note">
              Are you sure you want to submit the test? You will not be able to change your answers
              after submission.
            </p>
            <div className="exam-confirm-actions">
              <button
                type="button"
                className="exam-confirm-btn exam-confirm-btn--cancel"
                onClick={() => setShowSubmitConfirmModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="exam-confirm-btn exam-confirm-btn--submit"
                onClick={() => void submitTest()}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting…" : "Submit test"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {submitError ? (
        <div className="exam-result-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="exam-error-title">
          <div className="exam-result-modal exam-result-modal--error">
            <h2 id="exam-error-title" className="exam-result-title">Submission failed</h2>
            <p className="exam-result-error-text">{submitError}</p>
            <button type="button" className="exam-start-btn exam-result-btn" onClick={() => setSubmitError(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
