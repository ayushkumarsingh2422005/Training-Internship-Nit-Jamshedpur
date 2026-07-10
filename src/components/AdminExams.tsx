"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { IconActionButton, IconActionGroup } from "@/components/IconActionButton";
import { AdminExamEditor } from "@/components/AdminExamEditor";
import { isProctorFlagged } from "@/lib/exam-utils";

type AdminExamRow = {
  _id: string;
  testName: string;
  subject: string;
  subpart: string;
  status: string;
  startDateTime: string;
  endDateTime: string;
  durationMinutes: number;
  totalMarks: number;
  teacherName: string;
  teacherEmail: string;
  submissions: number;
  inProgress: number;
};

type AdminExamStats = {
  totalTests: number;
  publishedTests: number;
  totalSubmissions: number;
  inProgressAttempts: number;
  totalTabSwitches: number;
  totalFocusLosses: number;
};

export function AdminExams() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tests, setTests] = useState<AdminExamRow[]>([]);
  const [stats, setStats] = useState<AdminExamStats | null>(null);
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});
  const [liveAttempts, setLiveAttempts] = useState<Record<string, any[]>>({});
  const [testResults, setTestResults] = useState<Record<string, any[]>>({});
  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/exams", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load examinations.");
      setTests(data.tests || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load examinations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadLiveAttempts(testId: string) {
    try {
      const res = await fetch(`/api/admin/exams/live?testId=${encodeURIComponent(testId)}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setLiveAttempts((prev) => ({ ...prev, [testId]: data.attempts || [] }));
      }
    } catch (err) {
      console.error("loadLiveAttempts error:", err);
    }
  }

  async function loadTestResults(testId: string) {
    try {
      const res = await fetch(`/api/admin/exams/results?testId=${encodeURIComponent(testId)}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setTestResults((prev) => ({ ...prev, [testId]: data.results || [] }));
      }
    } catch (err) {
      console.error("loadTestResults error:", err);
    }
  }

  function toggleExpand(testId: string) {
    setExpandedTests((prev) => {
      const opening = !prev[testId];
      if (opening) {
        void loadLiveAttempts(testId);
        void loadTestResults(testId);
      }
      return { ...prev, [testId]: opening };
    });
  }

  async function handleToggleStatus(testId: string, currentStatus: string) {
    const newStatus = currentStatus === "Draft" ? "Published" : "Draft";
    try {
      const res = await fetch("/api/admin/exams", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status.");
      setTests((prev) => prev.map((t) => (t._id === testId ? { ...t, status: newStatus } : t)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status.");
    }
  }

  async function handleTerminateAttempt(accessId: string, testId: string) {
    if (!confirm("Terminate this in-progress attempt?")) return;
    try {
      const res = await fetch("/api/admin/exams/terminate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to terminate.");
      void loadLiveAttempts(testId);
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to terminate.");
    }
  }

  if (loading) return <p className="admin-loading">Loading examinations…</p>;
  if (error) return <p className="admin-error">{error}</p>;

  return (
    <div className="admin-exams-panel">
      <p className="admin-muted admin-exams-hint">
        Admin can <strong>view, track, and edit</strong> all examinations. Creating new exams remains with teachers only.
      </p>

      {stats ? (
        <div className="admin-stats">
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.totalTests}</span>
            <span className="admin-stat-label">Total tests</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.publishedTests}</span>
            <span className="admin-stat-label">Published</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.totalSubmissions}</span>
            <span className="admin-stat-label">Submissions</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.inProgressAttempts}</span>
            <span className="admin-stat-label">In progress now</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.totalTabSwitches}</span>
            <span className="admin-stat-label">Tab switches (all)</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.totalFocusLosses}</span>
            <span className="admin-stat-label">Focus losses (all)</span>
          </div>
        </div>
      ) : null}

      {tests.length === 0 ? (
        <p className="admin-empty">No examinations created yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Module</th>
                <th>Teacher</th>
                <th>Window</th>
                <th>Status</th>
                <th>Submissions</th>
                <th>Live</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => {
                const expanded = expandedTests[t._id];
                const live = liveAttempts[t._id] || [];
                const results = testResults[t._id] || [];
                return (
                  <Fragment key={t._id}>
                    <tr>
                      <td>
                        <strong>{t.testName}</strong>
                        <br />
                        <span className="admin-muted">
                          {t.durationMinutes} min · {t.totalMarks} marks
                        </span>
                      </td>
                      <td>
                        {t.subject} — {t.subpart}
                      </td>
                      <td className="teacher-table-compact">
                        {t.teacherName}
                        <br />
                        <span className="admin-muted">{t.teacherEmail}</span>
                      </td>
                      <td className="teacher-table-compact">
                        {new Date(t.startDateTime).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                        <br />
                        <span className="admin-muted">
                          to{" "}
                          {new Date(t.endDateTime).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </td>
                      <td>{t.status}</td>
                      <td>{t.submissions}</td>
                      <td className={t.inProgress > 0 ? "teacher-proctor-flag" : ""}>{t.inProgress}</td>
                      <td>
                        <IconActionGroup>
                          <IconActionButton
                            icon="view"
                            label="Track live attempts and results"
                            variant="primary"
                            size="sm"
                            onClick={() => toggleExpand(t._id)}
                          />
                          <IconActionButton
                            icon="edit"
                            label="Edit examination"
                            variant="neutral"
                            size="sm"
                            onClick={() => setEditingTestId(t._id)}
                          />
                          <IconActionButton
                            icon={t.status === "Published" ? "draft" : "publish"}
                            label={t.status === "Published" ? "Unpublish" : "Publish"}
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleToggleStatus(t._id, t.status)}
                          />
                        </IconActionGroup>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr>
                        <td colSpan={8} className="teacher-expanded-cell">
                          <div className="teacher-expanded-panel">
                            <h4 className="admin-subhead">Live attempts ({live.length})</h4>
                            {live.length === 0 ? (
                              <p className="admin-muted">No students currently in progress.</p>
                            ) : (
                              <div className="admin-table-wrap">
                                <table className="admin-table admin-table-compact">
                                  <thead>
                                    <tr>
                                      <th>Student</th>
                                      <th>Intern ID</th>
                                      <th>Time left</th>
                                      <th>Tabs</th>
                                      <th>Focus</th>
                                      <th>Flag</th>
                                      <th></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {live.map((a) => (
                                      <tr key={a.accessId}>
                                        <td>{a.studentName}</td>
                                        <td>{a.internId}</td>
                                        <td>{Math.floor((a.timeLeftSeconds || 0) / 60)}m</td>
                                        <td className={a.tabSwitches > 0 ? "teacher-proctor-flag" : ""}>
                                          {a.tabSwitches}
                                        </td>
                                        <td className={a.focusLosses > 0 ? "teacher-proctor-flag" : ""}>
                                          {a.focusLosses}
                                        </td>
                                        <td>{a.proctorFlagged ? "⚠" : "—"}</td>
                                        <td>
                                          <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => void handleTerminateAttempt(a.accessId, t._id)}
                                          >
                                            Terminate
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            <h4 className="admin-subhead">Submissions ({results.length})</h4>
                            {results.length === 0 ? (
                              <p className="admin-muted">No submissions yet.</p>
                            ) : (
                              <div className="admin-table-wrap">
                                <table className="admin-table admin-table-compact">
                                  <thead>
                                    <tr>
                                      <th>Student</th>
                                      <th>Intern ID</th>
                                      <th>Score</th>
                                      <th>Accuracy</th>
                                      <th>C / I / U</th>
                                      <th>Tabs</th>
                                      <th>Focus</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {results.map((r) => (
                                      <tr key={r._id}>
                                        <td>{r.studentId?.fullName || "—"}</td>
                                        <td>{r.studentId?.internId || "—"}</td>
                                        <td>
                                          <strong>{r.totalScore}</strong>
                                        </td>
                                        <td>{r.accuracyPercentage}%</td>
                                        <td>
                                          {r.correctQuestions} / {r.incorrectQuestions} / {r.unattemptedQuestions}
                                        </td>
                                        <td className={r.accessId?.tabSwitches > 0 ? "teacher-proctor-flag" : ""}>
                                          {r.accessId?.tabSwitches ?? 0}
                                        </td>
                                        <td className={r.accessId?.focusLosses > 0 ? "teacher-proctor-flag" : ""}>
                                          {r.accessId?.focusLosses ?? 0}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
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

      {editingTestId ? (
        <AdminExamEditor
          testId={editingTestId}
          onClose={() => setEditingTestId(null)}
          onSaved={() => void load()}
        />
      ) : null}
    </div>
  );
}
