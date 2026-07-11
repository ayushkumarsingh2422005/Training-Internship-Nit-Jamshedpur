"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { IconActionButton, IconActionGroup } from "@/components/IconActionButton";

type ManualExamRow = {
  _id: string;
  examName: string;
  subject: string;
  subpart: string;
  examType: string;
  maxMarks: number;
  examDate?: string | null;
  notes?: string;
  resultCount?: number;
  createdBy?: { fullName?: string; email?: string } | null;
};

type ManualResultRow = {
  _id: string;
  score: number;
  remarks?: string;
  studentId?: {
    fullName?: string;
    email?: string;
    internId?: string | null;
    collegeName?: string;
  } | null;
};

export function AdminManualExams() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exams, setExams] = useState<ManualExamRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resultsByExam, setResultsByExam] = useState<Record<string, ManualResultRow[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/manual-exams", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load manual exams");
      setExams(data.exams || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load manual exams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleExpand(examId: string) {
    if (expandedId === examId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(examId);
    if (resultsByExam[examId]) return;

    try {
      const res = await fetch(`/api/admin/manual-exams?id=${encodeURIComponent(examId)}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load scores");
      setResultsByExam((prev) => ({ ...prev, [examId]: data.results || [] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scores");
    }
  }

  if (loading) return <p className="admin-loading">Loading manual results…</p>;

  return (
    <div>
      <div className="admin-application-toolbar">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <p className="admin-muted">
        Offline theory/lab marks entered by teachers (not CBT). Teachers create and edit these sheets.
      </p>

      {error ? <p className="admin-error">{error}</p> : null}

      {exams.length === 0 ? (
        <p className="admin-empty">No manual result sheets yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Module</th>
                <th>Type</th>
                <th>Max</th>
                <th>Teacher</th>
                <th>Scores</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => {
                const expanded = expandedId === exam._id;
                const results = resultsByExam[exam._id] || [];
                return (
                  <Fragment key={exam._id}>
                    <tr>
                      <td>
                        <strong>{exam.examName}</strong>
                        {exam.notes ? (
                          <>
                            <br />
                            <span className="admin-muted">{exam.notes}</span>
                          </>
                        ) : null}
                      </td>
                      <td>
                        {exam.subject} — {exam.subpart}
                      </td>
                      <td>{exam.examType}</td>
                      <td>{exam.maxMarks}</td>
                      <td>{exam.createdBy?.fullName || "—"}</td>
                      <td>{exam.resultCount ?? 0}</td>
                      <td>
                        <IconActionGroup>
                          <IconActionButton
                            icon="results"
                            label={expanded ? "Hide scores" : "View scores"}
                            text={expanded ? "Hide" : "View"}
                            showLabel
                            variant="primary"
                            size="sm"
                            onClick={() => void toggleExpand(exam._id)}
                          />
                        </IconActionGroup>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr>
                        <td colSpan={7}>
                          {results.length === 0 ? (
                            <p className="admin-muted">No scores entered yet.</p>
                          ) : (
                            <div className="admin-table-wrap">
                              <table className="admin-table">
                                <thead>
                                  <tr>
                                    <th>Student</th>
                                    <th>Intern ID</th>
                                    <th>Score</th>
                                    <th>Remarks</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {results.map((r) => (
                                    <tr key={r._id}>
                                      <td>
                                        <strong>{r.studentId?.fullName || "—"}</strong>
                                        <br />
                                        <span className="admin-muted">{r.studentId?.email}</span>
                                      </td>
                                      <td>{r.studentId?.internId || "—"}</td>
                                      <td>
                                        {r.score}/{exam.maxMarks}
                                      </td>
                                      <td>{r.remarks || "—"}</td>
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
    </div>
  );
}
