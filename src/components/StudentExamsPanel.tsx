"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { authHeaders } from "@/lib/student-session-client";
import type { StudentTestListItem } from "@/lib/student-test-status";
import { IconActionButton, IconActionGroup } from "@/components/IconActionButton";

function formatExamDateTime(value: string | Date) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatExamDate(value: string | Date) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeRemaining(end: Date, now = new Date()) {
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function attemptBadgeTone(label: string) {
  switch (label) {
    case "Submitted":
      return "submitted";
    case "In progress":
      return "in-progress";
    case "Terminated":
      return "terminated";
    case "Scheduled":
      return "scheduled";
    case "Not attempted":
      return "not-attempted";
    default:
      return "not-started";
  }
}

type ManualResultItem = {
  id: string;
  score: number;
  remarks: string;
  updatedAt: string;
  exam: {
    id: string;
    examName: string;
    subject: string;
    subpart: string;
    examType: string;
    maxMarks: number;
    examDate?: string | null;
    notes?: string;
  };
};

export function StudentExamsPanel() {
  const [tests, setTests] = useState<StudentTestListItem[]>([]);
  const [manualResults, setManualResults] = useState<ManualResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<"ongoing" | "upcoming" | "completed" | "manual">(
    "ongoing",
  );
  const [isMobile, setIsMobile] = useState(false);
  const initialTabSet = useRef(false);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [testsRes, manualRes] = await Promise.all([
        fetch("/api/student/tests", { headers: authHeaders() }),
        fetch("/api/student/manual-results", { headers: authHeaders() }),
      ]);
      const testsData = await testsRes.json();
      const manualData = await manualRes.json();
      if (!testsRes.ok) throw new Error(testsData.error || "Failed to load tests.");
      if (!manualRes.ok) throw new Error(manualData.error || "Failed to load entered results.");
      setTests(testsData.tests || []);
      setManualResults(manualData.results || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTests();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fetchTests]);

  useEffect(() => {
    if (loading || initialTabSet.current) return;
    if (tests.length === 0 && manualResults.length === 0) return;

    const ongoing = tests.filter((t) => t.scheduleCategory === "ongoing");
    const upcoming = tests.filter((t) => t.scheduleCategory === "upcoming");

    if (ongoing.length > 0) setActiveCategory("ongoing");
    else if (upcoming.length > 0) setActiveCategory("upcoming");
    else if (tests.some((t) => t.scheduleCategory === "completed")) setActiveCategory("completed");
    else if (manualResults.length > 0) setActiveCategory("manual");
    else setActiveCategory("completed");

    initialTabSet.current = true;
  }, [loading, tests, manualResults]);

  async function startTest(testId: string) {
    setActionError(null);
    try {
      const res = await fetch("/api/student/tests/access", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ testId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start test");

      window.location.href = `/exam/${data.studentHash}/${data.secureToken}?autostart=1`;
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to start test.");
    }
  }

  function openReport(testId: string) {
    window.location.href = `/student-portal/exam-report?testId=${encodeURIComponent(testId)}`;
  }

  if (loading) return <p className="admin-loading">Loading examinations…</p>;
  if (error) {
    return (
      <div className="student-exams-panel">
        <p className="admin-error">{error}</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void fetchTests()}>
          Retry
        </button>
      </div>
    );
  }

  const ongoing = tests.filter((test) => test.scheduleCategory === "ongoing");
  const upcoming = tests.filter((test) => test.scheduleCategory === "upcoming");
  const completed = tests.filter((test) => test.scheduleCategory === "completed");

  function renderTestCard(test: StudentTestListItem) {
    const start = new Date(test.startDateTime);
    const end = new Date(test.endDateTime);
    const now = new Date();
    const timeLeft =
      test.scheduleCategory === "ongoing"
        ? formatTimeRemaining(end, now)
        : test.scheduleCategory === "upcoming"
          ? `Opens ${formatExamDateTime(start)}`
          : null;
    const showScheduleBadge = test.scheduleCategory !== "ongoing";
    const scheduleLabel =
      test.scheduleCategory === "upcoming"
        ? "Upcoming"
        : test.scheduleCategory === "completed"
          ? "Completed"
          : "Ongoing";
    const attemptTone = attemptBadgeTone(test.attemptLabel);
    const accuracy =
      test.accuracyPercentage != null ? `${Math.round(test.accuracyPercentage)}%` : null;

    const note =
      test.scheduleCategory === "ongoing" && test.attemptLabel === "Submitted"
        ? "Report available after the exam window closes."
        : test.scheduleCategory === "completed" && !test.canDownloadReport
          ? "No report — this exam was not attempted."
          : null;
    const hasAction = test.canStart || test.canResume || test.canDownloadReport;

    return (
      <article
        key={test._id}
        className={`student-exam-card student-exam-card--${test.scheduleCategory}`}
      >
        <div className="student-exam-card-topbar">
          <p className="student-exam-card-eyebrow">
            {test.subject}
            {test.subpart ? ` · ${test.subpart}` : ""}
          </p>
          <div className="student-exam-card-badges">
            {showScheduleBadge ? (
              <span className={`student-exam-badge student-exam-badge--${test.scheduleCategory}`}>
                {scheduleLabel}
              </span>
            ) : null}
            <span className={`student-exam-badge student-exam-badge--${attemptTone}`}>
              {test.attemptLabel}
            </span>
          </div>
        </div>

        <h5 className="student-exam-card-title">{test.testName}</h5>

        <p className="student-exam-card-meta">
          <span>{test.durationMinutes} min</span>
          <span>{test.totalMarks} marks</span>
          {test.scheduleCategory === "ongoing" && timeLeft ? (
            <span className="student-exam-meta-highlight">{timeLeft}</span>
          ) : null}
          {test.hasResult && test.totalScore != null ? (
            <span className="student-exam-meta-score">
              Score {test.totalScore}/{test.totalMarks}
              {accuracy ? ` (${accuracy})` : ""}
            </span>
          ) : null}
        </p>

        <p className="student-exam-card-window">
          <span className="student-exam-card-window-label">Window</span>
          {formatExamDateTime(start)} – {formatExamDateTime(end)}
          {test.scheduleCategory === "upcoming" && timeLeft ? (
            <span className="student-exam-card-window-hint">{timeLeft}</span>
          ) : null}
        </p>

        {hasAction || note ? (
          <div className="student-exam-card-footer">
            {note ? <p className="student-exam-card-note">{note}</p> : <span aria-hidden="true" />}
            {hasAction ? (
              <IconActionGroup>
                {test.canStart ? (
                  <IconActionButton
                    icon="play"
                    label="Start this examination"
                    text="Start test"
                    showLabel
                    variant="success"
                    size="sm"
                    className="student-exam-card-cta"
                    onClick={() => void startTest(test._id)}
                  />
                ) : null}
                {test.canResume ? (
                  <IconActionButton
                    icon="play"
                    label="Resume your in-progress attempt"
                    text="Resume test"
                    showLabel
                    variant="success"
                    size="sm"
                    className="student-exam-card-cta"
                    onClick={() => void startTest(test._id)}
                  />
                ) : null}
                {test.canDownloadReport ? (
                  <IconActionButton
                    icon="report"
                    label="View detailed result report"
                    text="View report"
                    showLabel
                    variant="primary"
                    size="sm"
                    className="student-exam-card-cta"
                    onClick={() => openReport(test._id)}
                  />
                ) : null}
              </IconActionGroup>
            ) : null}
          </div>
        ) : null}
      </article>
    );
  }

  function renderManualCard(item: ManualResultItem) {
    return (
      <article key={item.id} className="student-exam-card student-exam-card--completed">
        <div className="student-exam-card-topbar">
          <p className="student-exam-card-eyebrow">
            {item.exam.subject}
            {item.exam.subpart ? ` · ${item.exam.subpart}` : ""}
          </p>
          <div className="student-exam-card-badges">
            <span className="student-exam-badge student-exam-badge--completed">{item.exam.examType}</span>
            <span className="student-exam-badge student-exam-badge--submitted">Entered mark</span>
          </div>
        </div>

        <h5 className="student-exam-card-title">{item.exam.examName}</h5>

        <p className="student-exam-card-meta">
          <span>{item.exam.maxMarks} marks</span>
          <span className="student-exam-meta-score">
            Score {item.score}/{item.exam.maxMarks}
          </span>
        </p>

        {item.exam.examDate ? (
          <p className="student-exam-card-window">
            <span className="student-exam-card-window-label">Exam date</span>
            {formatExamDate(item.exam.examDate)}
          </p>
        ) : null}

        {item.remarks ? <p className="student-exam-card-note">{item.remarks}</p> : null}
      </article>
    );
  }

  const tabs = [
    { id: "ongoing" as const, label: "Ongoing / Live", count: ongoing.length, tone: "ongoing" },
    { id: "upcoming" as const, label: "Upcoming", count: upcoming.length, tone: "upcoming" },
    { id: "completed" as const, label: "Completed", count: completed.length, tone: "completed" },
    { id: "manual" as const, label: "Entered marks", count: manualResults.length, tone: "completed" },
  ];

  const cbtList =
    activeCategory === "ongoing" ? ongoing : activeCategory === "upcoming" ? upcoming : completed;

  return (
    <div className="student-exams-panel">
      <div className="student-exams-head">
        <h4>My assigned examinations</h4>
        <IconActionButton
          icon="refresh"
          label="Refresh exam list"
          variant="neutral"
          size="sm"
          onClick={() => void fetchTests()}
        />
      </div>

      {actionError ? <p className="admin-error student-exams-action-error">{actionError}</p> : null}

      <div className={`student-exams-layout${isMobile ? " student-exams-layout--mobile" : ""}`}>
        <nav className="student-exams-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`student-exams-nav-btn${activeCategory === tab.id ? ` student-exams-nav-btn--active student-exams-nav-btn--${tab.tone}` : ""}`}
              onClick={() => setActiveCategory(tab.id)}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>

        <div className="student-exams-content">
          {activeCategory === "manual" ? (
            manualResults.length === 0 ? (
              <p className="admin-muted">No entered theory/lab marks yet.</p>
            ) : (
              <div className="student-exams-list">{manualResults.map((item) => renderManualCard(item))}</div>
            )
          ) : cbtList.length === 0 ? (
            <p className="admin-muted">No exams in this category.</p>
          ) : (
            <div className="student-exams-list">{cbtList.map((test) => renderTestCard(test))}</div>
          )}
        </div>
      </div>
    </div>
  );
}
