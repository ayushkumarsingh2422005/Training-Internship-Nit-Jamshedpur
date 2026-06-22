"use client";

import { useState, useEffect, useCallback } from "react";
import { saveTeacherSession, getTeacherSession, clearTeacherSession, authHeaders } from "@/lib/teacher-session-client";
import { useTopLoading } from "@/components/TopLoadingProvider";

export function TeacherDashboard() {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teacher, setTeacher] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});

  // Test creation states
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [testForm, setTestForm] = useState({
    testName: "",
    moduleIndex: 0,
    durationMinutes: 60,
    startDateTime: "",
    endDateTime: "",
    instructions: "",
    isNegativeMarking: true,
    status: "Draft" as "Draft" | "Published",
  });

  const [formQuestions, setFormQuestions] = useState<any[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [currentQForm, setCurrentQForm] = useState({
    questionText: "",
    questionType: "Single Correct" as "Single Correct" | "Multiple Correct" | "Integer Type",
    options: [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
    correctIntegerAnswer: "",
    explanation: "",
    marks: 4,
    negativeMarks: 1,
  });

  // Fetch tests and results
  const fetchData = useCallback(async () => {
    if (!teacher) return;
    setLoading(true);
    try {
      // Fetch Tests
      const testRes = await fetch("/api/teachers/tests", { headers: authHeaders() });
      const testData = await testRes.json();
      if (testRes.ok) {
        setTests(testData.tests || []);
      }

      // Fetch Results
      const resRes = await fetch("/api/teachers/results", { headers: authHeaders() });
      const resData = await resRes.json();
      if (resRes.ok) {
        setResults(resData.results || []);
      }
    } catch (err) {
      console.error("fetchData error:", err);
    } finally {
      setLoading(false);
    }
  }, [teacher]);

  // Handle auto-session login on mount
  useEffect(() => {
    const token = getTeacherSession();
    if (token && !teacher) {
      // Re-auth / Fetch teacher me
      setLoading(true);
      fetch("/api/teachers/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "", phoneNumber: "", autoAuthToken: token }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated) {
            saveTeacherSession(data.token);
            setTeacher(data.teacher);
          } else {
            clearTeacherSession();
          }
        })
        .catch(() => clearTeacherSession())
        .finally(() => setLoading(false));
    }
  }, [teacher]);

  useEffect(() => {
    if (teacher) {
      fetchData();
    }
  }, [teacher, fetchData]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useTopLoading(loading);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teachers/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phoneNumber }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      saveTeacherSession(data.token);
      setTeacher(data.teacher);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearTeacherSession();
    setTeacher(null);
    setEmail("");
    setPhoneNumber("");
    setTests([]);
    setResults([]);
    setIsCreatingTest(false);
  }

  async function handleToggleStatus(testId: string, currentStatus: "Draft" | "Published") {
    const newStatus = currentStatus === "Draft" ? "Published" : "Draft";
    setLoading(true);
    try {
      const res = await fetch("/api/teachers/tests", {
        method: "PATCH",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ testId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update test status");
      setTests((prev) => prev.map((t) => (t._id === testId ? { ...t, status: newStatus } : t)));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTest(testId: string) {
    if (!window.confirm("Are you sure you want to delete this test? All student marks and progress for this test will be lost. This action cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/teachers/tests?id=${testId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete test");
      setTests((prev) => prev.filter((t) => t._id !== testId));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpandTest(testId: string) {
    setExpandedTests((prev) => ({
      ...prev,
      [testId]: !prev[testId],
    }));
  }

  function downloadCSV(testName: string, testResults: any[]) {
    if (testResults.length === 0) {
      alert("No submissions available to download.");
      return;
    }

    const headers = [
      "Student Name",
      "Intern ID",
      "Email",
      "Branch",
      "Module",
      "Score",
      "Accuracy %",
      "Correct Answers",
      "Incorrect Answers",
      "Unattempted Answers",
      "Time Spent (Minutes)"
    ];

    const rows = testResults.map((r) => [
      `"${r.studentId?.fullName || "Deleted Student"}"`,
      `"${r.studentId?.internId || "N/A"}"`,
      `"${r.studentId?.email || "N/A"}"`,
      `"${r.studentId?.branch || "N/A"}"`,
      `"${r.studentId?.subject || ""} - ${r.studentId?.subpart || ""}"`,
      r.totalScore,
      `"${r.accuracyPercentage}%"`,
      r.correctQuestions,
      r.incorrectQuestions,
      r.unattemptedQuestions,
      Math.round(r.totalTimeSpentSeconds / 60)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${testName.replace(/\s+/g, "_")}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Question Management
  function handleAddQuestionOption() {
    setCurrentQForm((prev) => ({
      ...prev,
      options: [...prev.options, { text: "", isCorrect: false }],
    }));
  }

  function handleRemoveQuestionOption(index: number) {
    setCurrentQForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  }

  function handleOptionChange(index: number, field: "text" | "isCorrect", value: any) {
    setCurrentQForm((prev) => {
      const newOpts = [...prev.options];
      if (field === "isCorrect" && prev.questionType === "Single Correct") {
        // Uncheck all other options
        newOpts.forEach((o, i) => {
          o.isCorrect = i === index;
        });
      } else {
        newOpts[index] = { ...newOpts[index], [field]: value };
      }
      return { ...prev, options: newOpts };
    });
  }

  function saveManualQuestion() {
    if (!currentQForm.questionText.trim()) {
      alert("Question text is required.");
      return;
    }

    if (currentQForm.questionType === "Integer Type") {
      if (currentQForm.correctIntegerAnswer === "") {
        alert("Correct integer answer is required.");
        return;
      }
    } else {
      const correctCount = currentQForm.options.filter((o) => o.isCorrect).length;
      if (correctCount === 0) {
        alert("Please select at least one correct option.");
        return;
      }
      if (currentQForm.options.some((o) => !o.text.trim())) {
        alert("Please fill in text for all options.");
        return;
      }
    }

    const questionObj = {
      questionText: currentQForm.questionText,
      questionType: currentQForm.questionType,
      options: currentQForm.questionType === "Integer Type" ? [] : currentQForm.options,
      correctIntegerAnswer: currentQForm.questionType === "Integer Type" ? Number(currentQForm.correctIntegerAnswer) : null,
      explanation: currentQForm.explanation,
      marks: currentQForm.marks,
      negativeMarks: currentQForm.negativeMarks,
    };

    setFormQuestions((prev) => [...prev, questionObj]);
    setShowQuestionModal(false);

    // Reset current form
    setCurrentQForm({
      questionText: "",
      questionType: "Single Correct",
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
      correctIntegerAnswer: "",
      explanation: "",
      marks: 4,
      negativeMarks: 1,
    });
  }

  // CSV Parsing
  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split(/\r?\n/);
        const parsed: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Simple CSV parsing to respect quoted fields
          const row: string[] = [];
          let insideQuote = false;
          let current = "";

          for (let c = 0; c < line.length; c++) {
            const char = line[c];
            if (char === '"') {
              insideQuote = !insideQuote;
            } else if (char === "," && !insideQuote) {
              row.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          row.push(current.trim());

          if (row.length < 2) continue;

          const [
            qText,
            qType,
            opt1,
            opt2,
            opt3,
            opt4,
            correctAns,
            explanation,
            qMarks,
            qNegMarks,
          ] = row;

          const cleanText = qText.replace(/^"|"$/g, "");
          const typeStr = (qType || "Single Correct").replace(/^"|"$/g, "");
          const cleanExplanation = (explanation || "").replace(/^"|"$/g, "");
          const marksVal = Number(qMarks) || 4;
          const negVal = Number(qNegMarks) || 1;

          let options: any[] = [];
          let correctInteger: number | null = null;

          if (typeStr === "Integer Type") {
            correctInteger = Number(correctAns) || 0;
          } else {
            const rawOpts = [opt1, opt2, opt3, opt4].filter((o) => o !== undefined && o !== "").map(o => o.replace(/^"|"$/g, ""));
            const correctIndices = (correctAns || "")
              .replace(/^"|"$/g, "")
              .split(",")
              .map((s) => parseInt(s.trim(), 10) - 1);

            options = rawOpts.map((txt, idx) => ({
              text: txt,
              isCorrect: correctIndices.includes(idx),
            }));
          }

          parsed.push({
            questionText: cleanText,
            questionType: typeStr,
            options,
            correctIntegerAnswer: correctInteger,
            explanation: cleanExplanation,
            marks: marksVal,
            negativeMarks: negVal,
          });
        }

        if (parsed.length > 0) {
          setFormQuestions((prev) => [...prev, ...parsed]);
          alert(`Successfully uploaded ${parsed.length} questions from CSV!`);
        } else {
          alert("No valid rows found in CSV.");
        }
      } catch (err: any) {
        alert("Error parsing CSV file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // clear input
  }

  // Save Test
  async function handleSaveTest() {
    if (!testForm.testName.trim()) {
      alert("Please enter a Test Name.");
      return;
    }
    if (!testForm.startDateTime || !testForm.endDateTime) {
      alert("Please specify start and end date/times.");
      return;
    }
    if (new Date(testForm.startDateTime) >= new Date(testForm.endDateTime)) {
      alert("Start time must be before End time.");
      return;
    }
    if (formQuestions.length === 0) {
      alert("Please add at least one question to the test.");
      return;
    }

    const selectedModule = teacher.assignedModules[testForm.moduleIndex];
    if (!selectedModule) {
      alert("Please select a valid assigned module.");
      return;
    }

    const calculatedTotalMarks = formQuestions.reduce((acc, q) => acc + (q.marks || 0), 0);

    setLoading(true);
    try {
      const payload = {
        testName: testForm.testName,
        subject: selectedModule.subject,
        subpart: selectedModule.subpart,
        startDateTime: testForm.startDateTime,
        endDateTime: testForm.endDateTime,
        durationMinutes: testForm.durationMinutes,
        instructions: testForm.instructions,
        totalMarks: calculatedTotalMarks,
        isNegativeMarking: testForm.isNegativeMarking,
        status: testForm.status,
        questions: formQuestions,
      };

      const res = await fetch("/api/teachers/tests", {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save test.");
      }

      alert("Test created and assigned successfully!");
      setIsCreatingTest(false);
      // Reset form
      setTestForm({
        testName: "",
        moduleIndex: 0,
        durationMinutes: 60,
        startDateTime: "",
        endDateTime: "",
        instructions: "",
        isNegativeMarking: true,
        status: "Draft",
      });
      setFormQuestions([]);
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!teacher) {
    return (
      <main className="page-main">
        <div className="container">
          <header className="page-header">
            <h1>Teacher Login</h1>
            <p className="page-lead">Login to manage tests and view student results.</p>
          </header>
          <section className="shortlist-lookup">
            <div className="shortlist-lookup-card">
              <form className="shortlist-form compact-form" onSubmit={handleLogin}>
                <div className="shortlist-form-row">
                  <div className="form-field">
                    <label>Email</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                  </div>
                  <div className="form-field">
                    <label>Mobile Number</label>
                    <input type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} disabled={loading} />
                  </div>
                </div>
                {error && <div className="alert alert-error compact-alert" style={{ marginTop: "1rem" }}><p>{error}</p></div>}
                <div className="shortlist-form-actions" style={{ marginTop: "1rem" }}>
                  <button type="submit" className="btn btn-green btn-sm" disabled={loading}>
                    {loading ? "Authenticating..." : "Login"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page-main">
      <div className="container" style={{ maxWidth: "1200px" }}>
        <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>Teacher Dashboard</h1>
            <p className="page-lead">Welcome, {teacher.fullName}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Log out</button>
        </header>

        {!isCreatingTest ? (
          <div className="shortlist-lookup">
            <div className="shortlist-lookup-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h3>Your Configured Tests</h3>
                <button className="btn btn-green btn-sm" onClick={() => setIsCreatingTest(true)}>
                  Create New Test
                </button>
              </div>

              {tests.length === 0 ? (
                <div className="profile-result-placeholder">
                  <p>No tests created yet. Click "Create New Test" to get started.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {tests.map((t) => {
                    const testResults = results.filter((r) => r.testId?._id?.toString() === t._id?.toString() || r.testId?.toString() === t._id?.toString());
                    return (
                      <div key={t._id} style={{ border: "1px solid #e2e8f0", padding: "1.5rem", borderRadius: "10px", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <h4 style={{ margin: 0, color: "#1e293b" }}>{t.testName}</h4>
                          <span style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "9999px",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                            background: t.status === "Published" ? "#d1fae5" : "#fee2e2",
                            color: t.status === "Published" ? "#065f46" : "#991b1b"
                          }}>
                            {t.status}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#64748b" }}>
                          <strong>Module:</strong> {t.subject} - {t.subpart}
                        </p>
                        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#64748b" }}>
                          <strong>Time Window:</strong> {new Date(t.startDateTime).toLocaleString()} to {new Date(t.endDateTime).toLocaleString()}
                        </p>
                        <p style={{ margin: 0, fontSize: "0.9rem", color: "#64748b" }}>
                          <strong>Duration:</strong> {t.durationMinutes} mins | <strong>Total Marks:</strong> {t.totalMarks} | <strong>Negative Marking:</strong> {t.isNegativeMarking ? "Yes" : "No"}
                        </p>

                        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "1rem" }}>
                          <button
                            className={`btn btn-sm ${t.status === "Published" ? "btn-secondary" : "btn-green"}`}
                            onClick={() => handleToggleStatus(t._id, t.status)}
                            disabled={loading}
                          >
                            {t.status === "Published" ? "Make Draft" : "Publish Test"}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-admin"
                            style={{ borderColor: "#ef4444", color: "#ef4444" }}
                            onClick={() => handleDeleteTest(t._id)}
                            disabled={loading}
                          >
                            Delete
                          </button>
                          <button
                            className="btn btn-sm btn-outline-admin"
                            style={{ borderColor: "#3b82f6", color: "#3b82f6", marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.25rem" }}
                            onClick={() => toggleExpandTest(t._id)}
                          >
                            {expandedTests[t._id] ? "Hide Submissions ▲" : "View Submissions ▼"}
                          </button>
                          <button
                            className="btn btn-sm btn-green"
                            style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
                            onClick={() => downloadCSV(t.testName, testResults)}
                            disabled={testResults.length === 0}
                          >
                            📥 Download Excel
                          </button>
                        </div>

                        {/* Collapsible Submissions Panel */}
                        {expandedTests[t._id] && (
                          <div style={{ marginTop: "1rem" }}>
                            <h5 style={{ margin: "0 0 0.75rem 0", color: "#475569", fontSize: "0.9rem", fontWeight: "bold" }}>
                              Student Submissions ({testResults.length})
                            </h5>
                            {testResults.length === 0 ? (
                              <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", fontStyle: "italic" }}>
                                No submissions yet for this test.
                              </p>
                            ) : (
                              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                                  <thead>
                                    <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                                      <th style={{ padding: "0.5rem 0.75rem", color: "#475569" }}>Student Name</th>
                                      <th style={{ padding: "0.5rem 0.75rem", color: "#475569" }}>Intern ID</th>
                                      <th style={{ padding: "0.5rem 0.75rem", color: "#475569" }}>Score</th>
                                      <th style={{ padding: "0.5rem 0.75rem", color: "#475569" }}>Accuracy</th>
                                      <th style={{ padding: "0.5rem 0.75rem", color: "#475569" }}>Correct/Incorrect/Skip</th>
                                      <th style={{ padding: "0.5rem 0.75rem", color: "#475569" }}>Time Spent</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {testResults.map((r) => (
                                      <tr key={r._id} style={{ borderBottom: "1px solid #e2e8f0", background: "white" }}>
                                        <td style={{ padding: "0.5rem 0.75rem", fontWeight: "bold", color: "#334155" }}>
                                          {r.studentId?.fullName || "Deleted Student"}
                                        </td>
                                        <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>
                                          {r.studentId?.internId || "N/A"}
                                        </td>
                                        <td style={{ padding: "0.5rem 0.75rem", fontWeight: "bold", color: "#10b981" }}>
                                          {r.totalScore}
                                        </td>
                                        <td style={{ padding: "0.5rem 0.75rem", color: "#334155" }}>
                                          {r.accuracyPercentage}%
                                        </td>
                                        <td style={{ padding: "0.5rem 0.75rem" }}>
                                          <span style={{ color: "#10b981" }}>{r.correctQuestions}✔</span> /{" "}
                                          <span style={{ color: "#ef4444" }}>{r.incorrectQuestions}✘</span> /{" "}
                                          <span style={{ color: "#64748b" }}>{r.unattemptedQuestions}⚪</span>
                                        </td>
                                        <td style={{ padding: "0.5rem 0.75rem", color: "#475569" }}>
                                          {Math.round(r.totalTimeSpentSeconds / 60)} mins
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TEST CREATION SCREEN */
          <div className="shortlist-lookup">
            <div className="shortlist-lookup-card" style={{ padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "1rem" }}>
                <h2>Create New Examination</h2>
                <button className="btn btn-secondary btn-sm" onClick={() => setIsCreatingTest(false)}>
                  Back to Tests
                </button>
              </div>

              <div className="shortlist-form">
                {/* Basic Details */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                  <div className="form-field">
                    <label>Test Name</label>
                    <input
                      type="text"
                      required
                      value={testForm.testName}
                      onChange={(e) => setTestForm({ ...testForm, testName: e.target.value })}
                      placeholder="e.g. CSE Module 1 Final Exam"
                    />
                  </div>

                  <div className="form-field">
                    <label>Assign to Module (Enrolled Students)</label>
                    <select
                      value={testForm.moduleIndex}
                      onChange={(e) => setTestForm({ ...testForm, moduleIndex: Number(e.target.value) })}
                      style={{ padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px", width: "100%", background: "white" }}
                    >
                      {teacher.assignedModules?.map((mod: any, index: number) => (
                        <option key={index} value={index}>
                          {mod.subject} - {mod.subpart}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                  <div className="form-field">
                    <label>Start Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={testForm.startDateTime}
                      onChange={(e) => setTestForm({ ...testForm, startDateTime: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>End Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={testForm.endDateTime}
                      onChange={(e) => setTestForm({ ...testForm, endDateTime: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Duration (Minutes)</label>
                    <input
                      type="number"
                      required
                      min={5}
                      value={testForm.durationMinutes}
                      onChange={(e) => setTestForm({ ...testForm, durationMinutes: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-field" style={{ marginBottom: "1.5rem" }}>
                  <label>Instructions (Optional)</label>
                  <textarea
                    rows={3}
                    value={testForm.instructions}
                    onChange={(e) => setTestForm({ ...testForm, instructions: e.target.value })}
                    placeholder="Enter special guidelines for students during the secure exam..."
                    style={{ padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px", width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "1rem" : "2rem", alignItems: isMobile ? "flex-start" : "center", marginBottom: "2rem", background: "#f8fafc", padding: "1rem", borderRadius: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "600", fontSize: "0.95rem" }}>
                    <input
                      type="checkbox"
                      checked={testForm.isNegativeMarking}
                      onChange={(e) => setTestForm({ ...testForm, isNegativeMarking: e.target.checked })}
                      style={{ width: "1.1rem", height: "1.1rem" }}
                    />
                    Enable Negative Marking
                  </label>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <label style={{ fontWeight: "600", fontSize: "0.95rem" }}>Save as:</label>
                    <select
                      value={testForm.status}
                      onChange={(e) => setTestForm({ ...testForm, status: e.target.value as any })}
                      style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "6px", background: "white" }}
                    >
                      <option value="Draft">Draft (Hidden from students)</option>
                      <option value="Published">Published (Active for students in time slot)</option>
                    </select>
                  </div>
                </div>

                {/* Question Section Header */}
                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: "1rem", borderTop: "2px solid #e2e8f0", paddingTop: "1.5rem", marginBottom: "1rem" }}>
                  <h3>Questions ({formQuestions.length})</h3>
                  <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "1rem", width: isMobile ? "100%" : "auto" }}>
                    {/* CSV upload input */}
                    <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", width: isMobile ? "100%" : "auto" }}>
                      Bulk Upload Questions (CSV)
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCSVUpload}
                        style={{ display: "none" }}
                      />
                    </label>

                    <button className="btn btn-green btn-sm" style={{ width: isMobile ? "100%" : "auto" }} onClick={() => setShowQuestionModal(true)}>
                      + Add Question Manually
                    </button>
                  </div>
                </div>

                {/* CSV Instructions Alert */}
                <div style={{ background: "#eff6ff", color: "#1e40af", padding: "1rem", borderRadius: "8px", fontSize: "0.85rem", lineHeight: "1.4", marginBottom: "1.5rem" }}>
                  <strong>CSV Template Guidelines:</strong> Make sure headers match: <code>Question Text, Type, Option 1, Option 2, Option 3, Option 4, Correct Answer, Explanation, Marks, Negative Marks</code>.
                  <br />
                  - <strong>Type:</strong> Use <code>Single Correct</code>, <code>Multiple Correct</code>, or <code>Integer Type</code>.
                  <br />
                  - <strong>Correct Answer:</strong> For MCQ, use 1-based indices (e.g. <code>2</code> or <code>1,3</code>). For Integer, enter the raw number.
                </div>

                {/* Added Questions List */}
                {formQuestions.length === 0 ? (
                  <div className="profile-result-placeholder" style={{ marginBottom: "2rem" }}>
                    <p>No questions added to this test yet. Add questions manually or bulk upload a CSV.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
                    {formQuestions.map((q, idx) => (
                      <div key={idx} style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "1rem", background: "#f8fafc" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                          <div>
                            <span style={{ background: "#e2e8f0", color: "#334155", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold", marginRight: "0.5rem" }}>
                              Q{idx + 1}: {q.questionType}
                            </span>
                            <span style={{ background: "#dbeafe", color: "#1e40af", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold" }}>
                              +{q.marks} / -{q.negativeMarks} Marks
                            </span>
                          </div>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ background: "#fee2e2", color: "#991b1b", border: "none", padding: "0.2rem 0.5rem" }}
                            onClick={() => setFormQuestions(formQuestions.filter((_, i) => i !== idx))}
                          >
                            Remove
                          </button>
                        </div>
                        <p style={{ fontWeight: "600", margin: "0.5rem 0", color: "#1e293b" }}>{q.questionText}</p>

                        {q.questionType !== "Integer Type" ? (
                          <ul style={{ paddingLeft: "1.2rem", margin: "0.5rem 0", fontSize: "0.85rem", color: "#475569" }}>
                            {q.options.map((o: any, oIdx: number) => (
                              <li key={oIdx} style={{ color: o.isCorrect ? "#10b981" : "inherit", fontWeight: o.isCorrect ? "bold" : "normal" }}>
                                {o.text} {o.isCorrect && "✔"}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ margin: "0.5rem 0", fontSize: "0.85rem", fontWeight: "bold", color: "#10b981" }}>
                            Correct Integer Answer: {q.correctIntegerAnswer}
                          </p>
                        )}
                        {q.explanation && (
                          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.8rem", color: "#64748b", fontStyle: "italic" }}>
                            <strong>Solution:</strong> {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem" }}>
                  <button className="btn btn-secondary" onClick={() => setIsCreatingTest(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-green" onClick={handleSaveTest}>
                    Save and Publish Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Question Modal */}
      {showQuestionModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          overflowY: "auto",
          padding: "2rem"
        }}>
          <div style={{
            background: "white",
            padding: "2rem",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "600px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <h3 style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem", marginBottom: "1.5rem" }}>
              Add Test Question
            </h3>

            <div className="shortlist-form" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <div className="form-field">
                <label>Question Type</label>
                <select
                  value={currentQForm.questionType}
                  onChange={(e) => setCurrentQForm({
                    ...currentQForm,
                    questionType: e.target.value as any,
                    // If Integer type, clear options, else add mock options
                    options: e.target.value === "Integer Type" ? [] : [
                      { text: "", isCorrect: false },
                      { text: "", isCorrect: false },
                      { text: "", isCorrect: false },
                      { text: "", isCorrect: false },
                    ]
                  })}
                  style={{ padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px", width: "100%", background: "white" }}
                >
                  <option value="Single Correct">Single Correct MCQ</option>
                  <option value="Multiple Correct">Multiple Correct MCQ</option>
                  <option value="Integer Type">Integer Type Answer</option>
                </select>
              </div>

              <div className="form-field">
                <label>Question Text</label>
                <textarea
                  rows={3}
                  required
                  value={currentQForm.questionText}
                  onChange={(e) => setCurrentQForm({ ...currentQForm, questionText: e.target.value })}
                  placeholder="Enter the question text here..."
                  style={{ padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px", width: "100%" }}
                />
              </div>

              {/* MCQ Options */}
              {currentQForm.questionType !== "Integer Type" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <label style={{ fontWeight: "600", fontSize: "0.9rem" }}>Options & Correct Key</label>
                  {currentQForm.options.map((opt, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <input
                        type={currentQForm.questionType === "Single Correct" ? "radio" : "checkbox"}
                        name="correct-option-group"
                        checked={opt.isCorrect}
                        onChange={(e) => handleOptionChange(idx, "isCorrect", e.target.checked)}
                        style={{ width: "1.1rem", height: "1.1rem", cursor: "pointer" }}
                      />
                      <input
                        type="text"
                        placeholder={`Option ${idx + 1}`}
                        value={opt.text}
                        onChange={(e) => handleOptionChange(idx, "text", e.target.value)}
                        style={{ flex: 1, padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                      />
                      {currentQForm.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestionOption(idx)}
                          style={{ background: "none", border: "none", color: "#ef4444", fontSize: "1.2rem", cursor: "pointer" }}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
                    onClick={handleAddQuestionOption}
                  >
                    + Add Option
                  </button>
                </div>
              )}

              {/* Integer Answer */}
              {currentQForm.questionType === "Integer Type" && (
                <div className="form-field">
                  <label>Correct Integer Value</label>
                  <input
                    type="number"
                    required
                    value={currentQForm.correctIntegerAnswer}
                    onChange={(e) => setCurrentQForm({ ...currentQForm, correctIntegerAnswer: e.target.value })}
                    placeholder="e.g. 42"
                  />
                </div>
              )}

              {/* Explanation */}
              <div className="form-field">
                <label>Solution / Explanation (Optional)</label>
                <textarea
                  rows={2}
                  value={currentQForm.explanation}
                  onChange={(e) => setCurrentQForm({ ...currentQForm, explanation: e.target.value })}
                  placeholder="Provide step-by-step solution for student reviews..."
                  style={{ padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px", width: "100%" }}
                />
              </div>

              {/* Marks configuration */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-field">
                  <label>Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={currentQForm.marks}
                    onChange={(e) => setCurrentQForm({ ...currentQForm, marks: Number(e.target.value) })}
                  />
                </div>
                <div className="form-field">
                  <label>Negative Marks</label>
                  <input
                    type="number"
                    min={0}
                    value={currentQForm.negativeMarks}
                    onChange={(e) => setCurrentQForm({ ...currentQForm, negativeMarks: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowQuestionModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-green" onClick={saveManualQuestion}>
                  Add to Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
