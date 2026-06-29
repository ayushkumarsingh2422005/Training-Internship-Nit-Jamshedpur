"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { authHeaders } from "@/lib/student-session-client";
import type { StudentTestListItem } from "@/lib/student-test-status";

export function StudentExamsPanel() {
  const [tests, setTests] = useState<StudentTestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<"ongoing" | "upcoming" | "completed">("ongoing");
  const [isMobile, setIsMobile] = useState(false);
  const initialTabSet = useRef(false);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/tests", { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load tests.");
      const data = await res.json();
      setTests(data.tests || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fetchTests]);

  useEffect(() => {
    if (loading || initialTabSet.current || tests.length === 0) return;

    const ongoing = tests.filter((t) => t.scheduleCategory === "ongoing");
    const upcoming = tests.filter((t) => t.scheduleCategory === "upcoming");
    const completed = tests.filter((t) => t.scheduleCategory === "completed");

    if (ongoing.length > 0) setActiveCategory("ongoing");
    else if (upcoming.length > 0) setActiveCategory("upcoming");
    else setActiveCategory("completed");

    initialTabSet.current = true;
  }, [loading, tests]);

  async function startTest(testId: string) {
    try {
      const res = await fetch("/api/student/tests/access", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ testId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start test");

      window.location.href = `/exam/${data.studentHash}/${data.secureToken}?autostart=1`;
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function downloadReportPDF(testId: string) {
    try {
      const res = await fetch(`/api/student/tests/result-report?testId=${testId}`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load report data.");
      }

      // Generate HTML for printing
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Pop-up blocker is enabled. Please allow pop-ups to download the PDF report.");
        return;
      }

      const { test, student, result, questions } = data;

      const html = `
        <html>
        <head>
          <title>${test.testName} - Result Report</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 40px;
              line-height: 1.5;
              background-color: #fff;
            }
            .header-title {
              font-size: 26px;
              font-weight: 800;
              color: #1e3a8a;
              border-bottom: 4px solid #3b82f6;
              padding-bottom: 12px;
              margin-bottom: 24px;
            }
            .meta-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .meta-table td {
              padding: 10px 14px;
              border: 1px solid #e2e8f0;
              font-size: 14px;
            }
            .meta-label {
              font-weight: bold;
              background-color: #f8fafc;
              color: #475569;
              width: 25%;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              margin-bottom: 30px;
            }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 18px;
              text-align: center;
              background-color: #f8fafc;
              box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            }
            .card-val {
              font-size: 22px;
              font-weight: 800;
              color: #1e3a8a;
            }
            .card-lbl {
              font-size: 12px;
              color: #64748b;
              margin-top: 6px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .section-title {
              font-size: 20px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 35px;
              margin-bottom: 18px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 6px;
            }
            .question-block {
              margin-bottom: 25px;
              padding: 18px;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              background-color: #ffffff;
              page-break-inside: avoid;
              box-shadow: 0 1px 3px rgba(0,0,0,0.01);
            }
            .question-header {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              margin-bottom: 12px;
              font-size: 14px;
              color: #64748b;
            }
            .question-text {
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 16px;
              color: #0f172a;
            }
            .option-item {
              padding: 10px 14px;
              margin: 8px 0;
              border-radius: 8px;
              font-size: 14px;
              display: flex;
              align-items: center;
              transition: all 0.2s;
            }
            .option-correct {
              background-color: #ecfdf5;
              border: 1.5px solid #10b981;
              color: #065f46;
            }
            .option-incorrect {
              background-color: #fef2f2;
              border: 1.5px solid #ef4444;
              color: #991b1b;
            }
            .option-normal {
              background-color: #f8fafc;
              border: 1.5px solid #e2e8f0;
              color: #334155;
            }
            .badge-correct {
              background-color: #10b981;
              color: white;
              padding: 3px 10px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 600;
              margin-left: 10px;
            }
            .badge-incorrect {
              background-color: #ef4444;
              color: white;
              padding: 3px 10px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 600;
              margin-left: 10px;
            }
            .badge-selected {
              box-shadow: 0 0 0 2px #3b82f6;
            }
            .explanation {
              margin-top: 14px;
              font-style: italic;
              font-size: 13px;
              color: #475569;
              background-color: #f1f5f9;
              padding: 10px 14px;
              border-left: 4px solid #3b82f6;
              border-radius: 0 8px 8px 0;
            }
            @media print {
              body {
                margin: 20px;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 24px; display: flex; justify-content: flex-end;">
            <button onclick="window.print()" style="padding: 10px 24px; background-color: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);">
              Print / Save as PDF
            </button>
          </div>

          <div class="header-title">${test.testName}</div>

          <table class="meta-table">
            <tr>
              <td class="meta-label">Student Name</td>
              <td>${student.fullName}</td>
              <td class="meta-label">Intern ID</td>
              <td>${student.internId}</td>
            </tr>
            <tr>
              <td class="meta-label">Module / Program</td>
              <td>${test.subject} - ${test.subpart}</td>
              <td class="meta-label">Conducted By</td>
              <td>${test.teacherName}</td>
            </tr>
            <tr>
              <td class="meta-label">Email</td>
              <td>${student.email}</td>
              <td class="meta-label">College</td>
              <td>${student.collegeName || "N/A"}</td>
            </tr>
          </table>

          <div class="section-title">Performance Summary</div>
          <div class="summary-grid">
            <div class="card">
              <div class="card-val">${result.totalScore} / ${test.totalMarks}</div>
              <div class="card-lbl">Score Obtained</div>
            </div>
            <div class="card">
              <div class="card-val">${result.accuracyPercentage}%</div>
              <div class="card-lbl">Accuracy</div>
            </div>
            <div class="card">
              <div class="card-val">${result.correctQuestions} / ${questions.length}</div>
              <div class="card-lbl">Correct Questions</div>
            </div>
            <div class="card">
              <div class="card-val">${result.incorrectQuestions}</div>
              <div class="card-lbl">Incorrect Questions</div>
            </div>
            <div class="card">
              <div class="card-val">${result.unattemptedQuestions}</div>
              <div class="card-lbl">Unattempted Questions</div>
            </div>
            <div class="card">
              <div class="card-val">${Math.round(result.totalTimeSpentSeconds / 60)} mins</div>
              <div class="card-lbl">Time Spent</div>
            </div>
          </div>

          <div class="section-title">Detailed Question Report</div>
          ${questions.map((q: any, index: number) => {
        const { questionText, questionType, marks, studentSelection, options, correctIntegerAnswer, explanation } = q;
        const { isCorrect, isAttempted, selectedOptionIds, integerAnswer } = studentSelection;

        let attemptBadge = "";
        if (!isAttempted) {
          attemptBadge = '<span class="badge-incorrect" style="background-color: #64748b;">Skipped</span>';
        } else if (isCorrect) {
          attemptBadge = '<span class="badge-correct">Correct</span>';
        } else {
          attemptBadge = '<span class="badge-incorrect">Incorrect</span>';
        }

        let answersHtml = "";
        if (questionType === "Integer Type") {
          answersHtml = `
                <div style="margin-top: 10px; font-size: 14px;">
                  <div><strong>Your Answer:</strong> ${integerAnswer !== null ? integerAnswer : '<span style="color:#64748b; font-style:italic;">No answer entered</span>'}</div>
                  <div style="margin-top: 5px;"><strong>Correct Answer:</strong> ${correctIntegerAnswer}</div>
                </div>
              `;
        } else {
          answersHtml = options.map((opt: any) => {
            const isSelected = selectedOptionIds.includes(opt._id);
            const isOptCorrect = opt.isCorrect;

            let optClass = "option-normal";
            let suffix = "";

            if (isSelected && isOptCorrect) {
              optClass = "option-correct badge-selected";
              suffix = " <b>(Your Selection & Correct)</b>";
            } else if (isSelected && !isOptCorrect) {
              optClass = "option-incorrect badge-selected";
              suffix = " <b>(Your Selection - Wrong)</b>";
            } else if (!isSelected && isOptCorrect) {
              optClass = "option-correct";
              suffix = " <b>(Correct Answer)</b>";
            }

            return `
                  <div class="option-item ${optClass}">
                    <span>${opt.text}${suffix}</span>
                  </div>
                `;
          }).join("");
        }

        return `
              <div class="question-block">
                <div class="question-header">
                  <span>Question ${index + 1} (${questionType})</span>
                  <div>
                    <span>Marks: ${marks}</span>
                    ${attemptBadge}
                  </div>
                </div>
                <div class="question-text">${questionText}</div>
                <div class="options-container">
                  ${answersHtml}
                </div>
                ${explanation ? `<div class="explanation"><strong>Explanation:</strong> ${explanation}</div>` : ""}
              </div>
            `;
      }).join("")}

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (err: any) {
      alert("Error generating report: " + err.message);
    }
  }

  if (loading) return <p>Loading exams...</p>;
  if (error) return <p className="error">{error}</p>;

  const ongoing = tests.filter((test) => test.scheduleCategory === "ongoing");
  const upcoming = tests.filter((test) => test.scheduleCategory === "upcoming");
  const completed = tests.filter((test) => test.scheduleCategory === "completed");

  function attemptBadgeStyle(label: string) {
    switch (label) {
      case "Submitted":
        return { background: "#d1fae5", color: "#065f46" };
      case "In progress":
        return { background: "#fef3c7", color: "#92400e" };
      case "Not attempted":
      case "Terminated":
        return { background: "#fee2e2", color: "#991b1b" };
      case "Scheduled":
        return { background: "#dbeafe", color: "#1e40af" };
      default:
        return { background: "#f1f5f9", color: "#475569" };
    }
  }

  function renderTestCard(test: StudentTestListItem) {
    const start = new Date(test.startDateTime);
    const end = new Date(test.endDateTime);
    const scheduleLabel =
      test.scheduleCategory === "ongoing"
        ? "Ongoing"
        : test.scheduleCategory === "upcoming"
          ? "Upcoming"
          : "Completed";
    const scheduleStyle =
      test.scheduleCategory === "ongoing"
        ? { background: "#d1fae5", color: "#065f46" }
        : test.scheduleCategory === "upcoming"
          ? { background: "#dbeafe", color: "#1e40af" }
          : { background: "#f1f5f9", color: "#475569" };
    const attemptStyle = attemptBadgeStyle(test.attemptLabel);

    return (
      <div key={test._id} style={{ border: "1px solid #e2e8f0", padding: "1.25rem", borderRadius: "10px", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <h5 style={{ margin: "0 0 0.5rem 0", color: "#1e293b", fontSize: "1.05rem" }}>{test.testName}</h5>
        <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem", color: "#475569" }}>
          <strong>Window:</strong> {start.toLocaleString()} - {end.toLocaleString()}
        </p>
        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#475569" }}>
          <strong>Duration:</strong> {test.durationMinutes} mins | <strong>Marks:</strong> {test.totalMarks}
        </p>
        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#475569", display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <strong>Status:</strong>
          <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold", ...scheduleStyle }}>
            {scheduleLabel}
          </span>
          <strong style={{ marginLeft: "0.25rem" }}>Your attempt:</strong>
          <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold", ...attemptStyle }}>
            {test.attemptLabel}
          </span>
        </p>
        {test.hasResult && test.totalScore != null && (
          <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", color: "#475569" }}>
            <strong>Score:</strong> {test.totalScore} / {test.totalMarks}
            {test.accuracyPercentage != null && ` (${test.accuracyPercentage}% accuracy)`}
          </p>
        )}
        {!test.hasResult && <div style={{ marginBottom: "0.75rem" }} />}

        {test.canStart && (
          <button className="btn btn-green btn-sm" onClick={() => startTest(test._id)}>
            Start Test
          </button>
        )}

        {test.canResume && (
          <button className="btn btn-green btn-sm" onClick={() => startTest(test._id)}>
            Resume Test
          </button>
        )}

        {test.scheduleCategory === "ongoing" && test.attemptLabel === "Submitted" && (
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", fontStyle: "italic" }}>
            Report will be available after the exam window closes.
          </p>
        )}

        {test.canDownloadReport && (
          <button
            className="btn btn-sm btn-green"
            onClick={() => downloadReportPDF(test._id)}
            style={{ background: "#3b82f6", display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            📄 Download PDF Report
          </button>
        )}

        {test.scheduleCategory === "completed" && !test.canDownloadReport && (
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", fontStyle: "italic" }}>
            No report available — this exam was not attempted.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="student-exams-panel">
      <h4 style={{ marginBottom: "1.5rem" }}>My Assigned Examinations</h4>

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "2rem", minHeight: "400px" }}>
        {/* Left Vertical Navigation Menu */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "row" : "column",
          gap: "0.5rem",
          borderRight: isMobile ? "none" : "1px solid #e2e8f0",
          borderBottom: isMobile ? "1px solid #e2e8f0" : "none",
          paddingRight: isMobile ? "0" : "1.5rem",
          paddingBottom: isMobile ? "1rem" : "0",
          minWidth: isMobile ? "100%" : "220px",
          flexShrink: 0,
          overflowX: isMobile ? "auto" : "visible"
        }}>
          <button
            onClick={() => setActiveCategory("ongoing")}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              fontSize: "0.95rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              width: isMobile ? "auto" : "100%",
              flexShrink: 0,
              transition: "all 0.2s",
              background: activeCategory === "ongoing" ? "#d1fae5" : "transparent",
              color: activeCategory === "ongoing" ? "#065f46" : "#475569",
              borderLeft: !isMobile && activeCategory === "ongoing" ? "4px solid #10b981" : "4px solid transparent",
              borderBottom: isMobile && activeCategory === "ongoing" ? "4px solid #10b981" : "4px solid transparent"
            }}
          >
            🟢 Ongoing / Live ({ongoing.length})
          </button>
          <button
            onClick={() => setActiveCategory("upcoming")}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              fontSize: "0.95rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              width: isMobile ? "auto" : "100%",
              flexShrink: 0,
              transition: "all 0.2s",
              background: activeCategory === "upcoming" ? "#dbeafe" : "transparent",
              color: activeCategory === "upcoming" ? "#1e40af" : "#475569",
              borderLeft: !isMobile && activeCategory === "upcoming" ? "4px solid #3b82f6" : "4px solid transparent",
              borderBottom: isMobile && activeCategory === "upcoming" ? "4px solid #3b82f6" : "4px solid transparent"
            }}
          >
            📅 Upcoming ({upcoming.length})
          </button>
          <button
            onClick={() => setActiveCategory("completed")}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              fontSize: "0.95rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              width: isMobile ? "auto" : "100%",
              flexShrink: 0,
              transition: "all 0.2s",
              background: activeCategory === "completed" ? "#f1f5f9" : "transparent",
              color: activeCategory === "completed" ? "#475569" : "#475569",
              borderLeft: !isMobile && activeCategory === "completed" ? "4px solid #64748b" : "4px solid transparent",
              borderBottom: isMobile && activeCategory === "completed" ? "4px solid #64748b" : "4px solid transparent"
            }}
          >
            ✅ Completed ({completed.length})
          </button>
        </div>

        {/* Right Active Content Panel */}
        <div style={{ flex: 1 }}>
          {activeCategory === "ongoing" && (
            <div>
              <h5 style={{ color: "#10b981", borderBottom: "2px solid #10b981", paddingBottom: "0.5rem", marginBottom: "1.5rem", fontWeight: "bold" }}>
                Ongoing / Live Exams
              </h5>
              {ongoing.length === 0 ? (
                <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "0.95rem" }}>No exams are live right now.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {ongoing.map((test) => renderTestCard(test))}
                </div>
              )}
            </div>
          )}

          {activeCategory === "upcoming" && (
            <div>
              <h5 style={{ color: "#3b82f6", borderBottom: "2px solid #3b82f6", paddingBottom: "0.5rem", marginBottom: "1.5rem", fontWeight: "bold" }}>
                Upcoming Exams
              </h5>
              {upcoming.length === 0 ? (
                <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "0.95rem" }}>No upcoming exams scheduled.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {upcoming.map((test) => renderTestCard(test))}
                </div>
              )}
            </div>
          )}

          {activeCategory === "completed" && (
            <div>
              <h5 style={{ color: "#64748b", borderBottom: "2px solid #64748b", paddingBottom: "0.5rem", marginBottom: "1.5rem", fontWeight: "bold" }}>
                Completed Exams
              </h5>
              {completed.length === 0 ? (
                <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "0.95rem" }}>No completed exams yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {completed.map((test) => renderTestCard(test))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
