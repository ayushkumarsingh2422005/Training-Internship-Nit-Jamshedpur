"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authHeaders } from "@/lib/student-session-client";

type ReportQuestion = {
  _id: string;
  questionType: string;
  questionText: string;
  options: { _id: string; text: string; isCorrect?: boolean }[];
  correctIntegerAnswer?: number | null;
  explanation?: string;
  marks: number;
  studentSelection: {
    selectedOptionIds: string[];
    integerAnswer: number | null;
    isAttempted: boolean;
    isCorrect: boolean;
  };
};

type ReportPayload = {
  test: {
    testName: string;
    subject: string;
    subpart: string;
    totalMarks: number;
    teacherName: string;
  };
  student: {
    fullName: string;
    internId: string | null;
    email: string;
    collegeName: string;
  };
  result: {
    totalScore: number;
    correctQuestions: number;
    incorrectQuestions: number;
    unattemptedQuestions: number;
    accuracyPercentage: number;
    totalTimeSpentSeconds: number;
  };
  questions: ReportQuestion[];
};

function ExamReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get("testId");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportPayload | null>(null);

  const loadReport = useCallback(async () => {
    if (!testId) {
      setError("Missing test id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/tests/result-report?testId=${encodeURIComponent(testId)}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load report.");
      setReport(data as ReportPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  if (loading) return <p className="admin-loading">Loading report…</p>;
  if (error || !report) {
    return (
      <div className="exam-report-page">
        <p className="admin-error">{error || "Report unavailable."}</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => router.push("/student-portal")}>
          Back to portal
        </button>
      </div>
    );
  }

  const { test, student, result, questions } = report;

  return (
    <div className="exam-report-page">
      <div className="exam-report-toolbar no-print">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => router.push("/student-portal")}>
          ← Back to portal
        </button>
        <button type="button" className="btn btn-green btn-sm" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      <header className="exam-report-header">
        <h1>{test.testName}</h1>
        <p>{test.subject} — {test.subpart}</p>
      </header>

      <table className="exam-report-meta">
        <tbody>
          <tr>
            <th>Student</th>
            <td>{student.fullName}</td>
            <th>Intern ID</th>
            <td>{student.internId || "—"}</td>
          </tr>
          <tr>
            <th>Email</th>
            <td>{student.email}</td>
            <th>College</th>
            <td>{student.collegeName || "—"}</td>
          </tr>
          <tr>
            <th>Instructor</th>
            <td colSpan={3}>{test.teacherName}</td>
          </tr>
        </tbody>
      </table>

      <div className="exam-report-stats">
        <div className="exam-report-stat">
          <strong>{result.totalScore} / {test.totalMarks}</strong>
          <span>Score</span>
        </div>
        <div className="exam-report-stat">
          <strong>{result.accuracyPercentage}%</strong>
          <span>Accuracy</span>
        </div>
        <div className="exam-report-stat">
          <strong>{result.correctQuestions}</strong>
          <span>Correct</span>
        </div>
        <div className="exam-report-stat">
          <strong>{result.incorrectQuestions}</strong>
          <span>Incorrect</span>
        </div>
        <div className="exam-report-stat">
          <strong>{result.unattemptedQuestions}</strong>
          <span>Skipped</span>
        </div>
        <div className="exam-report-stat">
          <strong>{Math.round(result.totalTimeSpentSeconds / 60)} min</strong>
          <span>Time spent</span>
        </div>
      </div>

      <h2 className="exam-report-section">Detailed question report</h2>
      <div className="exam-report-questions">
        {questions.map((q, index) => {
          const sel = q.studentSelection;
          const statusClass = !sel.isAttempted
            ? "exam-report-q--skipped"
            : sel.isCorrect
              ? "exam-report-q--correct"
              : "exam-report-q--wrong";
          return (
            <article key={q._id} className={`exam-report-q ${statusClass}`}>
              <div className="exam-report-qhead">
                <span>Question {index + 1} ({q.questionType})</span>
                <span>{sel.isAttempted ? (sel.isCorrect ? "Correct" : "Incorrect") : "Skipped"} · {q.marks} marks</span>
              </div>
              <p className="exam-report-qtext">{q.questionText}</p>
              {q.questionType === "Integer Type" ? (
                <p>
                  Your answer: <strong>{sel.integerAnswer ?? "—"}</strong>
                  {" · "}
                  Correct: <strong>{q.correctIntegerAnswer ?? "—"}</strong>
                </p>
              ) : (
                <ul className="exam-report-options">
                  {q.options.map((opt) => {
                    const selected = sel.selectedOptionIds.some((id) => id.toString() === opt._id.toString());
                    const classes = [
                      selected ? "exam-report-opt--selected" : "",
                      opt.isCorrect ? "exam-report-opt--correct" : "",
                    ].filter(Boolean).join(" ");
                    return (
                      <li key={opt._id} className={classes || undefined}>
                        {opt.text}
                        {opt.isCorrect ? " ✓" : ""}
                        {selected && !opt.isCorrect ? " (your selection)" : ""}
                      </li>
                    );
                  })}
                </ul>
              )}
              {q.explanation ? (
                <p className="exam-report-explanation"><em>{q.explanation}</em></p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function ExamReportPage() {
  return (
    <Suspense fallback={<p className="admin-loading">Loading report…</p>}>
      <ExamReportContent />
    </Suspense>
  );
}
