"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { saveTeacherSession, getTeacherSession, clearTeacherSession, authHeaders } from "@/lib/teacher-session-client";
import { useTopLoading } from "@/components/TopLoadingProvider";

function statusBadgeClass(status: string) {
  return status === "Published" ? "teacher-badge teacher-badge-published" : "teacher-badge teacher-badge-draft";
}

export function TeacherDashboard() {
  const router = useRouter();
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teacher, setTeacher] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});

  // Test creation states
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [testForm, setTestForm] = useState({
    testName: "",
    moduleIndex: 0,
    durationMinutes: 60,
    startDateTime: "",
    endDateTime: "",
    instructions: "",
    isNegativeMarking: true,
    randomizeQuestions: true,
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
    timeLimitSeconds: 0,
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
    if (!token) {
      router.replace("/teacher-portal/login");
      return;
    }
    if (teacher) {
      setSessionLoading(false);
      return;
    }
    setSessionLoading(true);
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
          router.replace("/teacher-portal/login");
        }
      })
      .catch(() => {
        clearTeacherSession();
        router.replace("/teacher-portal/login");
      })
      .finally(() => setSessionLoading(false));
  }, [teacher, router]);

  useEffect(() => {
    if (teacher) {
      fetchData();
    }
  }, [teacher, fetchData]);

  useTopLoading(loading || sessionLoading);

  function handleLogout() {
    clearTeacherSession();
    setTeacher(null);
    setTests([]);
    setResults([]);
    setIsCreatingTest(false);
    setEditingTestId(null);
    router.push("/teacher-portal/login");
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
      "Time Spent (Minutes)",
      "Tab Switches",
      "Focus Losses",
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
      Math.round(r.totalTimeSpentSeconds / 60),
      r.accessId?.tabSwitches ?? 0,
      r.accessId?.focusLosses ?? 0,
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
  function resetTestForm() {
    setTestForm({
      testName: "",
      moduleIndex: 0,
      durationMinutes: 60,
      startDateTime: "",
      endDateTime: "",
      instructions: "",
      isNegativeMarking: true,
      randomizeQuestions: true,
      status: "Draft",
    });
    setFormQuestions([]);
    setEditingTestId(null);
  }

  async function handleEditTest(testId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/teachers/tests?id=${testId}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load test.");

      if (data.hasSubmissions) {
        alert("This test cannot be edited because students have already started or submitted it.");
        return;
      }

      const t = data.test;
      const moduleIndex = teacher.assignedModules?.findIndex(
        (m: { subject: string; subpart: string }) => m.subject === t.subject && m.subpart === t.subpart,
      ) ?? 0;

      setTestForm({
        testName: t.testName,
        moduleIndex: moduleIndex >= 0 ? moduleIndex : 0,
        durationMinutes: t.durationMinutes,
        startDateTime: new Date(t.startDateTime).toISOString().slice(0, 16),
        endDateTime: new Date(t.endDateTime).toISOString().slice(0, 16),
        instructions: t.instructions || "",
        isNegativeMarking: t.isNegativeMarking,
        randomizeQuestions: t.randomizeQuestions !== false,
        status: t.status,
      });
      setFormQuestions(data.questions || []);
      setEditingTestId(testId);
      setIsCreatingTest(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to load test.");
    } finally {
      setLoading(false);
    }
  }

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
      timeLimitSeconds: currentQForm.timeLimitSeconds,
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
      timeLimitSeconds: 0,
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
            qTimeLimit,
          ] = row;

          const cleanText = qText.replace(/^"|"$/g, "");
          const typeStr = (qType || "Single Correct").replace(/^"|"$/g, "");
          const cleanExplanation = (explanation || "").replace(/^"|"$/g, "");
          const marksParsed = Number(qMarks);
          const negParsed = Number(qNegMarks);
          const marksVal = qMarks !== "" && !Number.isNaN(marksParsed) ? marksParsed : 4;
          const negVal = qNegMarks !== "" && !Number.isNaN(negParsed) ? negParsed : 1;
          const timeLimitVal = Number(qTimeLimit) || 0;

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
            timeLimitSeconds: timeLimitVal,
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
        ...(editingTestId ? { testId: editingTestId } : {}),
        testName: testForm.testName,
        subject: selectedModule.subject,
        subpart: selectedModule.subpart,
        startDateTime: testForm.startDateTime,
        endDateTime: testForm.endDateTime,
        durationMinutes: testForm.durationMinutes,
        instructions: testForm.instructions,
        totalMarks: calculatedTotalMarks,
        isNegativeMarking: testForm.isNegativeMarking,
        randomizeQuestions: testForm.randomizeQuestions,
        status: testForm.status,
        questions: formQuestions,
      };

      const res = await fetch("/api/teachers/tests", {
        method: editingTestId ? "PUT" : "POST",
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

      alert(editingTestId ? "Test updated successfully!" : "Test created and assigned successfully!");
      setIsCreatingTest(false);
      resetTestForm();
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (sessionLoading || !teacher) {
    return <p className="admin-loading">Loading dashboard…</p>;
  }

  const publishedCount = tests.filter((t) => t.status === "Published").length;
  const draftCount = tests.length - publishedCount;

  return (
    <div className="admin-dashboard">
      <header className="admin-topbar">
        <div>
          <h1>Examinations dashboard</h1>
          <p>
            {teacher.fullName} — create tests, publish schedules, and review submissions for your assigned modules.
          </p>
        </div>
        <div className="admin-topbar-actions">
          <a href="/" className="btn btn-secondary btn-sm">
            Public site
          </a>
          <button type="button" className="btn btn-outline-admin btn-sm" onClick={() => void fetchData()} disabled={loading}>
            Refresh
          </button>
          <button type="button" className="btn btn-green btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <span className="admin-stat-value">{tests.length}</span>
          <span className="admin-stat-label">Total tests</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-value">{publishedCount}</span>
          <span className="admin-stat-label">Published</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-value">{draftCount}</span>
          <span className="admin-stat-label">Drafts</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-value">{results.length}</span>
          <span className="admin-stat-label">Submissions</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-value">{teacher.assignedModules?.length ?? 0}</span>
          <span className="admin-stat-label">Assigned modules</span>
        </div>
      </div>

      <div className="admin-section-switcher">
        <button
          type="button"
          className={`btn btn-sm ${!isCreatingTest ? "btn-green" : "btn-secondary"}`}
          onClick={() => { setIsCreatingTest(false); resetTestForm(); }}
        >
          My tests
        </button>
        <button
          type="button"
          className={`btn btn-sm ${isCreatingTest ? "btn-green" : "btn-secondary"}`}
          onClick={() => { resetTestForm(); setIsCreatingTest(true); }}
        >
          {editingTestId ? "Edit test" : "Create test"}
        </button>
      </div>

      {error ? <p className="admin-error">{error}</p> : null}

      {!isCreatingTest ? (
        <>
          <div className="admin-application-toolbar">
            <button type="button" className="btn btn-green btn-sm" onClick={() => { resetTestForm(); setIsCreatingTest(true); }}>
              + New examination
            </button>
          </div>

          {tests.length === 0 ? (
            <p className="admin-empty">No tests yet. Create your first examination.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Test name</th>
                    <th>Module</th>
                    <th>Window</th>
                    <th>Duration</th>
                    <th>Marks</th>
                    <th>Status</th>
                    <th>Submissions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t) => {
                    const testResults = results.filter(
                      (r) => r.testId?._id?.toString() === t._id?.toString() || r.testId?.toString() === t._id?.toString(),
                    );
                    const expanded = expandedTests[t._id];
                    return (
                      <Fragment key={t._id}>
                        <tr key={t._id}>
                          <td><strong>{t.testName}</strong></td>
                          <td>{t.subject} — {t.subpart}</td>
                          <td className="teacher-table-compact">
                            {new Date(t.startDateTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                            <br />
                            <span className="admin-muted">to {new Date(t.endDateTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
                          </td>
                          <td>{t.durationMinutes} min</td>
                          <td>{t.totalMarks}{t.isNegativeMarking ? " (−ve)" : ""}</td>
                          <td><span className={statusBadgeClass(t.status)}>{t.status}</span></td>
                          <td>{testResults.length}</td>
                          <td>
                            <div className="admin-row-actions">
                              <button type="button" className="btn btn-sm btn-secondary" onClick={() => toggleExpandTest(t._id)}>
                                {expanded ? "Hide" : "Results"}
                              </button>
                              <button
                                type="button"
                                className={`btn btn-sm ${t.status === "Published" ? "btn-secondary" : "btn-green"}`}
                                onClick={() => handleToggleStatus(t._id, t.status)}
                                disabled={loading}
                              >
                                {t.status === "Published" ? "Draft" : "Publish"}
                              </button>
                              <button type="button" className="btn btn-sm btn-outline-admin" onClick={() => handleEditTest(t._id)} disabled={loading}>
                                Edit
                              </button>
                              <button type="button" className="admin-icon-btn admin-icon-btn-danger" title="Delete" onClick={() => handleDeleteTest(t._id)} disabled={loading}>
                                ×
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-green"
                                onClick={() => downloadCSV(t.testName, testResults)}
                                disabled={testResults.length === 0}
                              >
                                CSV
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expanded ? (
                          <tr key={`${t._id}-detail`} className="admin-detail-row">
                            <td colSpan={8}>
                              <h3 className="admin-subhead">Submissions ({testResults.length})</h3>
                              {testResults.length === 0 ? (
                                <p className="admin-muted">No submissions yet.</p>
                              ) : (
                                <div className="admin-table-wrap">
                                  <table className="admin-table">
                                    <thead>
                                      <tr>
                                        <th>Student</th>
                                        <th>Intern ID</th>
                                        <th>Score</th>
                                        <th>Accuracy</th>
                                        <th>C / I / Skip</th>
                                        <th>Time</th>
                                        <th>Tabs</th>
                                        <th>Focus</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {testResults.map((r) => (
                                        <tr key={r._id}>
                                          <td>{r.studentId?.fullName || "—"}</td>
                                          <td>{r.studentId?.internId || "—"}</td>
                                          <td><strong>{r.totalScore}</strong></td>
                                          <td>{r.accuracyPercentage}%</td>
                                          <td>{r.correctQuestions} / {r.incorrectQuestions} / {r.unattemptedQuestions}</td>
                                          <td>{Math.round(r.totalTimeSpentSeconds / 60)}m</td>
                                          <td className={r.accessId?.tabSwitches > 0 ? "teacher-proctor-flag" : ""}>{r.accessId?.tabSwitches ?? 0}</td>
                                          <td className={r.accessId?.focusLosses > 0 ? "teacher-proctor-flag" : ""}>{r.accessId?.focusLosses ?? 0}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="admin-filters">
          <h2 className="admin-subhead">{editingTestId ? "Edit examination" : "Create examination"}</h2>
          <div className="admin-form-grid-two">
            <div className="form-field">
              <label>Test name</label>
              <input type="text" required value={testForm.testName} onChange={(e) => setTestForm({ ...testForm, testName: e.target.value })} placeholder="e.g. CSE Module 1 Final Exam" />
            </div>
            <div className="form-field">
              <label>Assigned module</label>
              <select value={testForm.moduleIndex} onChange={(e) => setTestForm({ ...testForm, moduleIndex: Number(e.target.value) })}>
                {teacher.assignedModules?.map((mod: { subject: string; subpart: string }, index: number) => (
                  <option key={index} value={index}>{mod.subject} — {mod.subpart}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Start</label>
              <input type="datetime-local" required value={testForm.startDateTime} onChange={(e) => setTestForm({ ...testForm, startDateTime: e.target.value })} />
            </div>
            <div className="form-field">
              <label>End</label>
              <input type="datetime-local" required value={testForm.endDateTime} onChange={(e) => setTestForm({ ...testForm, endDateTime: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Duration (minutes)</label>
              <input type="number" required min={5} value={testForm.durationMinutes} onChange={(e) => setTestForm({ ...testForm, durationMinutes: Number(e.target.value) })} />
            </div>
            <div className="form-field">
              <label>Status</label>
              <select value={testForm.status} onChange={(e) => setTestForm({ ...testForm, status: e.target.value as "Draft" | "Published" })}>
                <option value="Draft">Draft (hidden)</option>
                <option value="Published">Published</option>
              </select>
            </div>
            <div className="form-field admin-field-full">
              <label>Instructions (optional)</label>
              <textarea rows={2} value={testForm.instructions} onChange={(e) => setTestForm({ ...testForm, instructions: e.target.value })} placeholder="Guidelines shown before the secure exam" />
            </div>
          </div>
          <div className="admin-notice-checks">
            <label><input type="checkbox" checked={testForm.isNegativeMarking} onChange={(e) => setTestForm({ ...testForm, isNegativeMarking: e.target.checked })} /> Negative marking</label>
            <label><input type="checkbox" checked={testForm.randomizeQuestions} onChange={(e) => setTestForm({ ...testForm, randomizeQuestions: e.target.checked })} /> Randomize question order</label>
          </div>
          <div className="admin-application-toolbar">
            <h3 className="admin-subhead">Questions ({formQuestions.length})</h3>
            <label className="btn btn-secondary btn-sm teacher-file-btn">Upload CSV<input type="file" accept=".csv" onChange={handleCSVUpload} hidden /></label>
            <button type="button" className="btn btn-green btn-sm" onClick={() => setShowQuestionModal(true)}>+ Add question</button>
          </div>
          <p className="admin-muted teacher-csv-hint">CSV: Question Text, Type, Options 1–4, Correct Answer, Explanation, Marks, Negative Marks, Time Limit (seconds).</p>
          {formQuestions.length === 0 ? (
            <p className="admin-empty">No questions yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>#</th><th>Question</th><th>Type</th><th>Marks</th><th>Time</th><th></th></tr></thead>
                <tbody>
                  {formQuestions.map((q, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td className="teacher-q-preview">{q.questionText}</td>
                      <td>{q.questionType}</td>
                      <td>{q.negativeMarks > 0 ? `+${q.marks} / −${q.negativeMarks}` : `+${q.marks} (no −ve)`}</td>
                      <td>{q.timeLimitSeconds > 0 ? `${q.timeLimitSeconds}s` : "—"}</td>
                      <td><button type="button" className="admin-icon-btn admin-icon-btn-danger" onClick={() => setFormQuestions(formQuestions.filter((_, i) => i !== idx))}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="admin-filters-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setIsCreatingTest(false); resetTestForm(); }}>Cancel</button>
            <button type="button" className="btn btn-green btn-sm" onClick={handleSaveTest} disabled={loading}>{editingTestId ? "Update test" : "Save test"}</button>
          </div>
        </div>
      )}

      {showQuestionModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowQuestionModal(false)}>
          <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-subhead">Add question</h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowQuestionModal(false)}>Close</button>
            </div>
            <div className="admin-modal-body">
              <div className="form-field">
                <label>Question type</label>
                <select
                  value={currentQForm.questionType}
                  onChange={(e) => setCurrentQForm({
                    ...currentQForm,
                    questionType: e.target.value as typeof currentQForm.questionType,
                    options: e.target.value === "Integer Type" ? [] : [
                      { text: "", isCorrect: false },
                      { text: "", isCorrect: false },
                      { text: "", isCorrect: false },
                      { text: "", isCorrect: false },
                    ],
                  })}
                >
                  <option value="Single Correct">Single correct MCQ</option>
                  <option value="Multiple Correct">Multiple correct MCQ</option>
                  <option value="Integer Type">Integer type</option>
                </select>
              </div>

              <div className="form-field">
                <label>Question text</label>
                <textarea
                  rows={3}
                  required
                  value={currentQForm.questionText}
                  onChange={(e) => setCurrentQForm({ ...currentQForm, questionText: e.target.value })}
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
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
                <div className="form-field">
                  <label>Time Limit (seconds, 0 = none)</label>
                  <input
                    type="number"
                    min={0}
                    value={currentQForm.timeLimitSeconds}
                    onChange={(e) => setCurrentQForm({ ...currentQForm, timeLimitSeconds: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="admin-filters-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowQuestionModal(false)}>Cancel</button>
                <button type="button" className="btn btn-green btn-sm" onClick={saveManualQuestion}>Add to test</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
