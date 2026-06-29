"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentAttendanceCalendar } from "@/components/StudentAttendanceCalendar";
import {
  type AttendanceBreakdown,
  type StudentAttendanceEntry,
} from "@/lib/attendance";
import { useTopLoading } from "@/components/TopLoadingProvider";

type ReportRow = {
  applicationId: string;
  internId: string | null;
  fullName: string;
  email: string;
  phoneNumber: string;
  collegeName: string;
  subject: string;
  module: string;
  theory: AttendanceBreakdown;
  lab: AttendanceBreakdown;
  overall: AttendanceBreakdown;
};

type ReportListResponse = {
  modules: string[];
  stats: {
    totalStudents: number;
    withSessions: number;
    averageOverallPercentage: number;
    belowThreshold: number;
  };
  items: ReportRow[];
  error?: string;
};

type ReportDetailResponse = {
  student: {
    id: string;
    internId: string | null;
    fullName: string;
    email: string;
    phoneNumber: string;
    collegeName: string;
    subject: string;
    module: string;
    isVerifiedByAdmin: boolean;
  };
  theory: AttendanceBreakdown;
  lab: AttendanceBreakdown;
  overall: AttendanceBreakdown;
  entries: StudentAttendanceEntry[];
  error?: string;
};

function percentageClass(value: number, total: number): string {
  if (total <= 0) return "admin-attendance-pct-none";
  if (value >= 75) return "admin-attendance-pct-good";
  if (value >= 50) return "admin-attendance-pct-warn";
  return "admin-attendance-pct-low";
}

function internIdSortValue(internId: string | null): number | null {
  const normalized = internId?.trim().toUpperCase();
  if (!normalized) return null;
  const match = normalized.match(/(\d+)$/);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

function compareRows(a: ReportRow, b: ReportRow): number {
  const aNumeric = internIdSortValue(a.internId);
  const bNumeric = internIdSortValue(b.internId);
  if (aNumeric !== null && bNumeric !== null && aNumeric !== bNumeric) return aNumeric - bNumeric;
  if (aNumeric !== null && bNumeric === null) return -1;
  if (aNumeric === null && bNumeric !== null) return 1;
  return a.fullName.localeCompare(b.fullName);
}

function AttendanceDetailModal({
  applicationId,
  onClose,
}: {
  applicationId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReportDetailResponse | null>(null);

  useTopLoading(loading);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/attendance/report?applicationId=${encodeURIComponent(applicationId)}`,
      );
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const json = (await response.json()) as ReportDetailResponse;
      if (!response.ok) {
        setError(json.error ?? "Failed to load attendance detail.");
        return;
      }
      setDetail(json);
    } catch {
      setError("Network error while loading attendance detail.");
    } finally {
      setLoading(false);
    }
  }, [applicationId, router]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const summary = detail
    ? { theory: detail.theory, lab: detail.lab, overall: detail.overall }
    : null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal admin-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2 className="admin-subhead">Attendance report</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="admin-modal-body">
          {loading ? <p className="admin-loading">Loading attendance…</p> : null}
          {error ? (
            <p className="admin-error" role="alert">
              {error}
            </p>
          ) : null}
          {detail && summary ? (
            <>
              <div className="admin-attendance-report-student">
                <p>
                  <strong>{detail.student.fullName}</strong>
                  {detail.student.internId ? ` · ${detail.student.internId}` : ""}
                </p>
                <p className="admin-attendance-report-meta">
                  {detail.student.collegeName} · {detail.student.subject} · Module:{" "}
                  <strong>{detail.student.module}</strong>
                </p>
                <p className="admin-attendance-report-meta">
                  <a href={`mailto:${detail.student.email}`}>{detail.student.email}</a> ·{" "}
                  {detail.student.phoneNumber}
                </p>
              </div>

              <div className="student-attendance-stats admin-attendance-report-stats">
                <div className="student-attendance-stat-card">
                  <span className="student-attendance-stat-value">{summary.overall.percentage}%</span>
                  <span className="student-attendance-stat-label">Overall</span>
                  <span className="student-attendance-stat-sub">
                    {summary.overall.present} / {summary.overall.total} sessions
                  </span>
                </div>
                <div className="student-attendance-stat-card">
                  <span className="student-attendance-stat-value">{summary.theory.percentage}%</span>
                  <span className="student-attendance-stat-label">Theory</span>
                  <span className="student-attendance-stat-sub">
                    {summary.theory.present} present · {summary.theory.absent} absent
                  </span>
                </div>
                <div className="student-attendance-stat-card">
                  <span className="student-attendance-stat-value">{summary.lab.percentage}%</span>
                  <span className="student-attendance-stat-label">Lab</span>
                  <span className="student-attendance-stat-sub">
                    {summary.lab.present} present · {summary.lab.absent} absent
                  </span>
                </div>
              </div>

              {detail.entries.length > 0 ? (
                <StudentAttendanceCalendar entries={detail.entries} />
              ) : (
                <p className="admin-empty">No attendance sessions recorded for this student yet.</p>
              )}

              {detail.entries.length > 0 ? (
                <div className="admin-table-wrap admin-attendance-report-sessions">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Session</th>
                        <th>Topic</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.entries.map((entry) => (
                        <tr
                          key={entry.id}
                          className={
                            entry.status === "absent"
                              ? "admin-attendance-row-absent"
                              : "admin-attendance-row-present"
                          }
                        >
                          <td>{entry.date}</td>
                          <td>{entry.sessionType === "theory" ? "Theory" : "Lab"}</td>
                          <td>{entry.topic}</td>
                          <td>{entry.status === "present" ? "Present" : "Absent"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AdminAttendanceReport() {
  const router = useRouter();
  const [modules, setModules] = useState<string[]>([]);
  const [moduleName, setModuleName] = useState("");
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [items, setItems] = useState<ReportRow[]>([]);
  const [stats, setStats] = useState<ReportListResponse["stats"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);

  useTopLoading(loading);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (moduleName) params.set("module", moduleName);
      if (appliedQ) params.set("q", appliedQ);

      const response = await fetch(`/api/admin/attendance/report?${params.toString()}`);
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const json = (await response.json()) as ReportListResponse;
      if (!response.ok) {
        setError(json.error ?? "Failed to load attendance report.");
        return;
      }
      setModules(json.modules ?? []);
      setItems(json.items ?? []);
      setStats(json.stats ?? null);
    } catch {
      setError("Network error while loading attendance report.");
    } finally {
      setLoading(false);
    }
  }, [moduleName, appliedQ, router]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const sortedItems = useMemo(() => [...items].sort(compareRows), [items]);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setAppliedQ(q.trim());
  }

  return (
    <section className="admin-attendance-report">
      <p className="admin-attendance-lead">
        View attendance percentages for verified students by module. Open a student to see their full
        session history and calendar.
      </p>

      {stats ? (
        <div className="admin-stats admin-stats--compact">
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.totalStudents}</span>
            <span className="admin-stat-label">Verified students</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.withSessions}</span>
            <span className="admin-stat-label">With attendance</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.averageOverallPercentage}%</span>
            <span className="admin-stat-label">Average overall</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.belowThreshold}</span>
            <span className="admin-stat-label">Below 75%</span>
          </div>
        </div>
      ) : null}

      <form className="admin-filters" onSubmit={handleSearch}>
        <div className="admin-filters-row">
          <div className="form-field">
            <label htmlFor="attendance-report-module">Module</label>
            <select
              id="attendance-report-module"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
            >
              <option value="">All modules</option>
              {modules.map((moduleOption) => (
                <option key={moduleOption} value={moduleOption}>
                  {moduleOption}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field admin-field-full">
            <label htmlFor="attendance-report-q">Search</label>
            <input
              id="attendance-report-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, intern ID, email, phone, or college"
            />
          </div>
        </div>
        <div className="admin-filters-actions">
          <button type="submit" className="btn btn-green btn-sm">
            Apply filters
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setModuleName("");
              setQ("");
              setAppliedQ("");
            }}
          >
            Clear
          </button>
        </div>
      </form>

      {loading ? <p className="admin-loading">Loading report…</p> : null}
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && sortedItems.length === 0 ? (
        <p className="admin-empty">No students match your filters.</p>
      ) : null}

      {!loading && !error && sortedItems.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table admin-attendance-report-table">
            <thead>
              <tr>
                <th>Intern ID</th>
                <th>Name</th>
                <th>College</th>
                <th>Module</th>
                <th>Theory</th>
                <th>Lab</th>
                <th>Overall</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((row) => (
                <tr key={row.applicationId}>
                  <td>{row.internId || "—"}</td>
                  <td>{row.fullName}</td>
                  <td>{row.collegeName}</td>
                  <td>{row.module}</td>
                  <td>
                    <span className={percentageClass(row.theory.percentage, row.theory.total)}>
                      {row.theory.total > 0 ? `${row.theory.percentage}%` : "—"}
                    </span>
                  </td>
                  <td>
                    <span className={percentageClass(row.lab.percentage, row.lab.total)}>
                      {row.lab.total > 0 ? `${row.lab.percentage}%` : "—"}
                    </span>
                  </td>
                  <td>
                    <span className={percentageClass(row.overall.percentage, row.overall.total)}>
                      {row.overall.total > 0 ? `${row.overall.percentage}%` : "—"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedApplicationId(row.applicationId)}
                    >
                      View report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selectedApplicationId ? (
        <AttendanceDetailModal
          applicationId={selectedApplicationId}
          onClose={() => setSelectedApplicationId(null)}
        />
      ) : null}
    </section>
  );
}
