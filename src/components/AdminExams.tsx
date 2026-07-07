"use client";

import { useCallback, useEffect, useState } from "react";

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

  if (loading) return <p className="admin-loading">Loading examinations…</p>;
  if (error) return <p className="admin-error">{error}</p>;

  return (
    <div className="admin-exams-panel">
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
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t._id}>
                  <td>
                    <strong>{t.testName}</strong>
                    <br />
                    <span className="admin-muted">{t.durationMinutes} min · {t.totalMarks} marks</span>
                  </td>
                  <td>{t.subject} — {t.subpart}</td>
                  <td className="teacher-table-compact">
                    {t.teacherName}
                    <br />
                    <span className="admin-muted">{t.teacherEmail}</span>
                  </td>
                  <td className="teacher-table-compact">
                    {new Date(t.startDateTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    <br />
                    <span className="admin-muted">
                      to {new Date(t.endDateTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </td>
                  <td>{t.status}</td>
                  <td>{t.submissions}</td>
                  <td className={t.inProgress > 0 ? "teacher-proctor-flag" : ""}>{t.inProgress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
