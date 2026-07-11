"use client";

import { useCallback, useEffect, useState } from "react";
import { authHeaders } from "@/lib/student-session-client";
import { IconActionButton } from "@/components/IconActionButton";
import { downloadOverallResultsPdf } from "@/lib/student-results-pdf";
import type { Application } from "@/types/application";

type ResultItem = {
  id: string;
  source: "cbt" | "manual";
  examName: string;
  subject: string;
  subpart: string;
  examType: string;
  score: number;
  maxMarks: number;
  examDate: string | null;
  canDownloadReport: boolean;
  testId: string | null;
  remarks: string;
  accuracyPercentage: number | null;
};

type ResultsSummary = {
  examCount: number;
  totalGot: number;
  totalMax: number;
  overallPercentage: number;
};

type StudentResultsPanelProps = {
  application: Application;
};

function formatExamDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function examPct(score: number, maxMarks: number) {
  if (!maxMarks || maxMarks <= 0) return 0;
  return Math.round((score / maxMarks) * 1000) / 10;
}

export function StudentResultsPanel({ application }: StudentResultsPanelProps) {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [summary, setSummary] = useState<ResultsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/results", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load results.");
      setResults(data.results || []);
      setSummary(data.summary || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load results.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchResults();
  }, [fetchResults]);

  function openReport(testId: string) {
    window.location.href = `/student-portal/exam-report?testId=${encodeURIComponent(testId)}`;
  }

  async function handleDownloadOverallPdf() {
    if (!summary || results.length === 0) return;
    setPdfLoading(true);
    setPdfError(null);
    try {
      await downloadOverallResultsPdf(
        {
          fullName: application.fullName,
          internId: application.internId ?? null,
          email: application.email,
          phoneNumber: application.phoneNumber,
          collegeName: application.collegeName,
          subject: application.subject,
          subpart: application.subpart,
        },
        results.map((item) => ({
          id: item.id,
          source: item.source,
          examName: item.examName,
          subject: item.subject,
          subpart: item.subpart,
          examType: item.examType,
          score: item.score,
          maxMarks: item.maxMarks,
          examDate: item.examDate,
          remarks: item.remarks,
          accuracyPercentage: item.accuracyPercentage,
        })),
        summary,
      );
    } catch (err: unknown) {
      setPdfError(err instanceof Error ? err.message : "Failed to download PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) return <p className="admin-loading">Loading results…</p>;
  if (error) {
    return (
      <div className="student-results-panel">
        <p className="admin-error">{error}</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void fetchResults()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="student-results-panel">
      <div className="student-results-head">
        <div>
          <h4>My results</h4>
          <p className="student-results-lead">All CBT and entered theory/lab marks in one place.</p>
        </div>
        {/* <div className="student-results-head-actions">
          {results.length > 0 && summary ? (
            <button
              type="button"
              className="student-results-overall-download"
              onClick={() => void handleDownloadOverallPdf()}
              disabled={pdfLoading}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {pdfLoading ? "Preparing PDF…" : "Download result"}
            </button>
          ) : null}
          <IconActionButton
            icon="refresh"
            label="Refresh results"
            variant="neutral"
            size="sm"
            onClick={() => void fetchResults()}
          />
        </div> */}
      </div>

      {pdfError ? <p className="admin-error">{pdfError}</p> : null}

      {summary ? (
        <div className="student-results-summary">
          <div className="student-results-summary-card student-results-summary-card--primary">
            <span className="student-results-summary-eyebrow">Overall</span>
            <span className="student-results-summary-value">{summary.overallPercentage}%</span>
            <span className="student-results-summary-label">Normalized out of 100</span>
            <div className="student-results-progress" aria-hidden="true">
              <span style={{ width: `${Math.min(100, Math.max(0, summary.overallPercentage))}%` }} />
            </div>
          </div>
          <div className="student-results-summary-card">
            <span className="student-results-summary-eyebrow">Marks</span>
            <span className="student-results-summary-value">
              {summary.totalGot}
              <span className="student-results-summary-of">/{summary.totalMax}</span>
            </span>
            <span className="student-results-summary-label">Total obtained</span>
          </div>
          <div className="student-results-summary-card">
            <span className="student-results-summary-eyebrow">Exams</span>
            <span className="student-results-summary-value">{summary.examCount}</span>
            <span className="student-results-summary-label">With recorded scores</span>
          </div>
        </div>
      ) : null}

      {results.length === 0 ? (
        <div className="student-results-empty">
          <p>No exam results yet.</p>
          <span>Scores will appear here once teachers publish CBT or enter marks.</span>
        </div>
      ) : (
        <div className="student-results-list">
          {results.map((item) => {
            const pct = examPct(item.score, item.maxMarks);
            return (
              <article
                key={`${item.source}-${item.id}`}
                className={`student-result-card student-result-card--${item.source}`}
              >
                <div className="student-result-card-main">
                  <div className="student-result-card-top">
                    <span
                      className={`student-result-type student-result-type--${item.source === "cbt" ? "cbt" : "manual"}`}
                    >
                      {item.source === "cbt" ? "CBT" : item.examType}
                    </span>
                    <span className="student-result-date">{formatExamDate(item.examDate)}</span>
                  </div>

                  <h5 className="student-result-title">{item.examName}</h5>
                  <p className="student-result-module">
                    {item.subject}
                    {item.subpart ? ` — ${item.subpart}` : ""}
                  </p>
                  {item.remarks ? <p className="student-result-remarks">{item.remarks}</p> : null}

                  <div className="student-result-score-block">
                    <div className="student-result-score-row">
                      <span className="student-result-score">
                        {item.score}
                        <span>/{item.maxMarks}</span>
                      </span>
                      <span className="student-result-pct">{pct}%</span>
                    </div>
                    <div className="student-results-progress student-results-progress--row" aria-hidden="true">
                      <span style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                    </div>
                    {item.accuracyPercentage != null ? (
                      <span className="student-result-accuracy">
                        {Math.round(item.accuracyPercentage)}% accuracy
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="student-result-card-action">
                  {item.source === "cbt" && item.testId && item.canDownloadReport ? (
                    <button
                      type="button"
                      className="student-result-download-btn"
                      onClick={() => openReport(item.testId!)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      View
                    </button>
                  ) : item.source === "cbt" && item.testId && !item.canDownloadReport ? (
                    <span className="student-result-status student-result-status--pending">
                      Report soon
                    </span>
                  ) : (
                    <span className="student-result-status student-result-status--manual">
                      Entered mark
                    </span>
                  )}
                </div>
              </article>
            );
          })}

          {/* {summary && summary.examCount > 0 ? (
            <div className="student-results-total-bar">
              <div>
                <strong>Combined total</strong>
                <span>
                  {summary.totalGot} of {summary.totalMax} marks
                </span>
              </div>
              <div className="student-results-total-pct">
                <strong>{summary.overallPercentage}%</strong>
                <span>overall</span>
              </div>
            </div>
          ) : null} */}
        </div>
      )}
    </div>
  );
}
