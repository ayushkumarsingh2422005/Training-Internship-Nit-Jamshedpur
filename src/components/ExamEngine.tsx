"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type ExamEngineProps = {
  studentHash: string;
  secureToken: string;
};

export function ExamEngine({ studentHash, secureToken }: ExamEngineProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExamActive, setIsExamActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Load exam and restore answers & context from localStorage
  useEffect(() => {
    async function loadExam() {
      try {
        const res = await fetch(`/api/student/tests/exam-data?studentHash=${studentHash}&secureToken=${secureToken}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load exam.");
        }
        setTestData(data.test);
        setQuestions(data.questions.map((q: any) => ({ ...q, type: q.questionType })));
        setTimeLeft(data.timeLeftSeconds);

        // Restore active state
        const activeKey = `exam_active_${data.test._id}_${studentHash}`;
        const savedActive = localStorage.getItem(activeKey);
        if (savedActive === "true") {
          setIsExamActive(true);
        }

        // Restore current question index
        const qIndexKey = `exam_qindex_${data.test._id}_${studentHash}`;
        const savedQIndex = localStorage.getItem(qIndexKey);
        if (savedQIndex) {
          setCurrentQIndex(Number(savedQIndex));
        }

        // Restore saved answers from localStorage
        const answersKey = `exam_answers_${data.test._id}_${studentHash}`;
        const savedAnswers = localStorage.getItem(answersKey);
        if (savedAnswers) {
          try {
            setAnswers(JSON.parse(savedAnswers));
          } catch (e) {
            console.error("Failed to parse saved answers", e);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [studentHash, secureToken]);

  // Save to localStorage whenever answers change
  useEffect(() => {
    if (!testData?._id) return;
    const key = `exam_answers_${testData._id}_${studentHash}`;
    localStorage.setItem(key, JSON.stringify(answers));
  }, [answers, testData, studentHash]);

  // Save active question index to localStorage
  useEffect(() => {
    if (!testData?._id) return;
    const key = `exam_qindex_${testData._id}_${studentHash}`;
    localStorage.setItem(key, currentQIndex.toString());
  }, [currentQIndex, testData, studentHash]);

  // Timer countdown
  useEffect(() => {
    if (loading || timeLeft <= 0 || !isExamActive) return;
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [loading, timeLeft, isExamActive]);

  // Auto-submit when time is up
  useEffect(() => {
    if (!loading && timeLeft <= 0 && isExamActive) {
      alert("Time has expired! Submitting test automatically.");
      submitTest(true);
    }
  }, [timeLeft, loading, isExamActive]);

  // Fullscreen helper
  const enterFullscreen = async () => {
    try {
      const elem = containerRef.current;
      if (elem) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).mozRequestFullScreen) {
          await (elem as any).mozRequestFullScreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).msRequestFullscreen) {
          await (elem as any).msRequestFullscreen();
        }
        setIsFullscreen(true);
        setIsExamActive(true);

        if (testData?._id) {
          const activeKey = `exam_active_${testData._id}_${studentHash}`;
          localStorage.setItem(activeKey, "true");
        }
      }
    } catch (err) {
      console.error("Error entering fullscreen:", err);
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      const active = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(active);
      if (!active && isExamActive) {
        alert("Warning: You exited full-screen mode! Your answers are saved locally. Please re-enter full-screen mode to resume your exam.");
      }
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
    };
  }, [isExamActive]);

  // Prevent back navigation using pushState/popstate
  useEffect(() => {
    if (!isExamActive) return;

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      alert("Warning: Navigating back is disabled during the exam. Please use the on-screen buttons to finish or navigate.");
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isExamActive]);

  // Prevent page close / reload
  useEffect(() => {
    if (!isExamActive) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const msg = "Are you sure you want to exit the exam? Your progress has been saved locally.";
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isExamActive]);

  function handleAnswerChange(qId: string, val: any) {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  }

  async function submitTest(force = false) {
    if (!force && !window.confirm("Are you sure you want to submit the test?")) return;
    try {
      const res = await fetch("/api/student/tests/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentHash, secureToken, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit exam.");
      }

      // Clear local storage on successful submit
      if (testData?._id) {
        const activeKey = `exam_active_${testData._id}_${studentHash}`;
        const answersKey = `exam_answers_${testData._id}_${studentHash}`;
        const qIndexKey = `exam_qindex_${testData._id}_${studentHash}`;
        
        localStorage.removeItem(activeKey);
        localStorage.removeItem(answersKey);
        localStorage.removeItem(qIndexKey);
      }

      alert(`Test Submitted successfully!\nScore: ${data.result.totalScore}\nCorrect: ${data.result.correctQuestions}\nIncorrect: ${data.result.incorrectQuestions}`);
      
      // Stop beforeunload handler
      setIsExamActive(false);

      setTimeout(() => {
        router.push("/student-portal");
      }, 100);
    } catch (err: any) {
      alert("Submission Error: " + err.message);
    }
  }

  function formatTime(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  if (loading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "white" }}>
      <h2>Loading Examination...</h2>
    </div>
  );

  if (error) return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "white", gap: "1rem" }}>
      <h2 style={{ color: "#ef4444" }}>Error Loading Exam</h2>
      <p>{error}</p>
      <button onClick={() => router.push("/student-portal")} style={{ padding: "0.5rem 1rem", background: "#3b82f6", border: "none", color: "white", borderRadius: "0.5rem", cursor: "pointer" }}>Go Back</button>
    </div>
  );

  return (
    <div ref={containerRef} style={{ height: "100vh", display: "flex", flexDirection: "column", background: isExamActive ? "#f8fafc" : "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", fontFamily: "system-ui, -apple-system, sans-serif", position: "relative" }}>
      {!isExamActive ? (
        // Welcome Screen (Forces Full Screen Mode)
        <div style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          width: "100%"
        }}>
          <div style={{
            background: "rgba(30, 41, 59, 0.7)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            padding: "3rem",
            borderRadius: "1.5rem",
            maxWidth: "600px",
            width: "100%",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            textAlign: "center"
          }}>
            <h2 style={{ fontSize: "2rem", marginBottom: "1.5rem", background: "linear-gradient(to right, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {testData.testName}
            </h2>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem", textAlign: "left" }}>
              <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "1rem", borderRadius: "0.75rem", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block" }}>Duration</span>
                <strong style={{ fontSize: "1.2rem" }}>{testData.durationMinutes} Minutes</strong>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "1rem", borderRadius: "0.75rem", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block" }}>Negative Marking</span>
                <strong style={{ fontSize: "1.2rem", color: testData.isNegativeMarking ? "#f87171" : "#4ade80" }}>
                  {testData.isNegativeMarking ? "Yes" : "No"}
                </strong>
              </div>
            </div>

            <div style={{ textAlign: "left", background: "rgba(255, 255, 255, 0.03)", padding: "1.5rem", borderRadius: "1rem", marginBottom: "2.5rem", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <h4 style={{ margin: "0 0 0.5rem 0", color: "#a78bfa" }}>Important Guidelines:</h4>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "#cbd5e1", lineHeight: "1.5" }}>
                {testData.instructions || "This test is conducted under secure full-screen mode. Please do not close or refresh this tab. If you accidentally exit full-screen mode, your answers are saved and you can click the resume button to continue."}
              </p>
            </div>

            <button 
              onClick={enterFullscreen}
              style={{
                width: "100%",
                padding: "1rem 2rem",
                fontSize: "1.1rem",
                fontWeight: "600",
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                color: "white",
                border: "none",
                borderRadius: "0.75rem",
                cursor: "pointer",
                boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.3)",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
            >
              Start Exam &amp; Enter Full Screen
            </button>
          </div>
        </div>
      ) : (
        // Active Exam View
        <>
          {/* Exited Full Screen Overlay */}
          {!isFullscreen && (
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(15, 23, 42, 0.98)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999,
              color: "white",
              padding: "2rem",
              textAlign: "center",
              fontFamily: "system-ui, sans-serif"
            }}>
              <h2 style={{ color: "#ef4444", marginBottom: "1rem" }}>Exam Paused: Full Screen Exited</h2>
              <p style={{ color: "#cbd5e1", maxWidth: "500px", marginBottom: "2rem", lineHeight: "1.6" }}>
                This exam requires active full-screen mode to ensure exam integrity. Your progress has been saved securely. Please click the button below to resume.
              </p>
              <button 
                onClick={enterFullscreen}
                style={{
                  padding: "1rem 2.5rem",
                  background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.75rem",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.3)"
                }}
              >
                Resume Full Screen &amp; Continue Exam
              </button>
            </div>
          )}

          {/* Header */}
          <header style={{ background: "#1e293b", color: "white", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>{testData.testName}</h1>
              <span style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Candidate Session Mode</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
              <div style={{ background: "#ef4444", padding: "0.5rem 1rem", borderRadius: "9999px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {formatTime(timeLeft)}
              </div>
              <button onClick={() => submitTest(false)} style={{ background: "#10b981", color: "white", border: "none", padding: "0.5rem 1.5rem", borderRadius: "0.5rem", fontWeight: 600, cursor: "pointer" }}>
                Finish Exam
              </button>
            </div>
          </header>

          {/* Main Layout */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {/* Left: Question Area */}
            <div style={{ flex: 1, padding: "2rem", overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ background: "white", padding: "2rem", borderRadius: "1rem", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #f1f5f9", paddingBottom: "1rem", marginBottom: "2rem" }}>
                  <h2 style={{ margin: 0, color: "#334155", fontSize: "1.5rem" }}>Question {currentQIndex + 1}</h2>
                  <span style={{ background: "#e2e8f0", color: "#475569", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: 500 }}>
                    {questions[currentQIndex]?.type}
                  </span>
                </div>
                
                <div style={{ fontSize: "1.125rem", color: "#1e293b", marginBottom: "2rem", lineHeight: 1.6 }}>
                  {questions[currentQIndex]?.questionText}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {questions[currentQIndex]?.type === "Single Correct" && questions[currentQIndex]?.options.map((opt: any) => (
                    <label key={opt._id} style={{ display: "flex", alignItems: "center", padding: "1rem", border: "2px solid #e2e8f0", borderRadius: "0.5rem", cursor: "pointer", background: answers[questions[currentQIndex]?._id] === opt._id ? "#f0f9ff" : "white", borderColor: answers[questions[currentQIndex]?._id] === opt._id ? "#3b82f6" : "#e2e8f0", transition: "all 0.2s" }}>
                      <input type="radio" name={questions[currentQIndex]?._id} checked={answers[questions[currentQIndex]?._id] === opt._id} onChange={() => handleAnswerChange(questions[currentQIndex]?._id, opt._id)} style={{ width: "1.25rem", height: "1.25rem", marginRight: "1rem", accentColor: "#3b82f6" }} />
                      <span style={{ fontSize: "1rem", color: "#334155" }}>{opt.text}</span>
                    </label>
                  ))}

                  {questions[currentQIndex]?.type === "Multiple Correct" && questions[currentQIndex]?.options.map((opt: any) => {
                    const isChecked = answers[questions[currentQIndex]?._id]?.includes(opt._id);
                    return (
                      <label key={opt._id} style={{ display: "flex", alignItems: "center", padding: "1rem", border: "2px solid #e2e8f0", borderRadius: "0.5rem", cursor: "pointer", background: isChecked ? "#f0f9ff" : "white", borderColor: isChecked ? "#3b82f6" : "#e2e8f0", transition: "all 0.2s" }}>
                        <input type="checkbox" checked={isChecked || false} onChange={(e) => {
                          const prev = answers[questions[currentQIndex]?._id] || [];
                          handleAnswerChange(questions[currentQIndex]?._id, e.target.checked ? [...prev, opt._id] : prev.filter((id: string) => id !== opt._id));
                        }} style={{ width: "1.25rem", height: "1.25rem", marginRight: "1rem", accentColor: "#3b82f6" }} />
                        <span style={{ fontSize: "1rem", color: "#334155" }}>{opt.text}</span>
                      </label>
                    );
                  })}

                  {questions[currentQIndex]?.type === "Integer Type" && (
                    <input 
                      type="number" 
                      value={answers[questions[currentQIndex]?._id] || ""} 
                      onChange={(e) => handleAnswerChange(questions[currentQIndex]?._id, e.target.value)} 
                      placeholder="Enter your numeric answer..."
                      style={{ padding: "1rem", fontSize: "1.125rem", border: "2px solid #e2e8f0", borderRadius: "0.5rem", width: "100%", maxWidth: "300px", outline: "none", transition: "border-color 0.2s" }}
                      onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                      onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                    />
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem" }}>
                <button 
                  onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  style={{ padding: "0.75rem 1.5rem", background: currentQIndex === 0 ? "#cbd5e1" : "#3b82f6", color: "white", border: "none", borderRadius: "0.5rem", fontWeight: 600, cursor: currentQIndex === 0 ? "not-allowed" : "pointer" }}
                >
                  &larr; Previous
                </button>
                <button 
                  onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentQIndex === questions.length - 1}
                  style={{ padding: "0.75rem 1.5rem", background: currentQIndex === questions.length - 1 ? "#cbd5e1" : "#3b82f6", color: "white", border: "none", borderRadius: "0.5rem", fontWeight: 600, cursor: currentQIndex === questions.length - 1 ? "not-allowed" : "pointer" }}
                >
                  Next &rarr;
                </button>
              </div>
            </div>

            {/* Right: Palette */}
            <div style={{ width: "320px", background: "white", borderLeft: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "1.5rem", borderBottom: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 1rem 0", color: "#1e293b" }}>Question Palette</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.875rem", color: "#64748b" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><div style={{ width: "1rem", height: "1rem", background: "#22c55e", borderRadius: "0.25rem" }}></div> Answered</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><div style={{ width: "1rem", height: "1rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "0.25rem" }}></div> Unanswered</div>
                </div>
              </div>
              <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", alignContent: "start" }}>
                {questions.map((q, idx) => {
                  const isAnswered = answers[q._id] !== undefined && answers[q._id] !== "" && (!Array.isArray(answers[q._id]) || answers[q._id].length > 0);
                  const isActive = currentQIndex === idx;
                  
                  return (
                    <button
                      key={q._id}
                      onClick={() => setCurrentQIndex(idx)}
                      style={{
                        aspectRatio: "1",
                        borderRadius: "0.5rem",
                        border: isActive ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                        background: isAnswered ? "#22c55e" : "#f1f5f9",
                        color: isAnswered ? "white" : "#334155",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s"
                      }}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
