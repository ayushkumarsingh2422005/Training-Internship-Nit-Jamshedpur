"use client";

import { useCallback, useEffect, useState } from "react";
import { StudentAttendanceCalendar } from "@/components/StudentAttendanceCalendar";
import { type StudentAttendanceEntry } from "@/lib/attendance";
import { authHeaders } from "@/lib/student-session-client";
import { useTopLoading } from "@/components/TopLoadingProvider";

type AttendanceData = {
  module: string;
  theory: { present: number; absent: number; total: number; percentage: number };
  lab: { present: number; absent: number; total: number; percentage: number };
  entries: StudentAttendanceEntry[];
};

export function StudentAttendancePanel() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useTopLoading(loading);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/applications/attendance", {
        headers: authHeaders(),
      });
      const json = (await response.json()) as AttendanceData & { error?: string };

      if (response.status === 401) {
        setError("Session expired. Please log out and sign in again.");
        return;
      }

      if (!response.ok) {
        setError(json.error ?? "Could not load attendance.");
        return;
      }

      setData(json);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="admin-loading">Loading attendance…</p>;
  }

  if (error) {
    return (
      <p className="accommodation-error" role="alert">
        {error}
      </p>
    );
  }

  if (!data) {
    return null;
  }

  const overallPresent = data.theory.present + data.lab.present;
  const overallTotal = data.theory.total + data.lab.total;
  const overallPercentage = overallTotal
    ? Math.round((overallPresent / overallTotal) * 100)
    : 0;

  return (
    <div className="accommodation-block student-attendance">
      <h4 className="accommodation-title">Attendance record</h4>
      <p className="accommodation-lead">
        Your module: <strong>{data.module}</strong>. Theory and lab sessions are tracked separately.
      </p>

      <div className="student-attendance-stats">
        <div className="student-attendance-stat-card">
          <span className="student-attendance-stat-value">{overallPercentage}%</span>
          <span className="student-attendance-stat-label">Overall</span>
          <span className="student-attendance-stat-sub">
            {overallPresent} / {overallTotal} sessions
          </span>
        </div>
        <div className="student-attendance-stat-card">
          <span className="student-attendance-stat-value">{data.theory.percentage}%</span>
          <span className="student-attendance-stat-label">Theory</span>
          <span className="student-attendance-stat-sub">
            {data.theory.present} present · {data.theory.absent} absent
          </span>
        </div>
        <div className="student-attendance-stat-card">
          <span className="student-attendance-stat-value">{data.lab.percentage}%</span>
          <span className="student-attendance-stat-label">Lab</span>
          <span className="student-attendance-stat-sub">
            {data.lab.present} present · {data.lab.absent} absent
          </span>
        </div>
      </div>

      <StudentAttendanceCalendar entries={data.entries} />
    </div>
  );
}
