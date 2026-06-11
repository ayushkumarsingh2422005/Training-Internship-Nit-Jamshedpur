"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type AttendanceSessionType,
  type AttendanceStatus,
  type AttendanceStudentRow,
  formatAttendanceSessionLabel,
} from "@/lib/attendance";
import { useTopLoading } from "@/components/TopLoadingProvider";

type SessionInfo = {
  id: string;
  date: string;
  module: string;
  sessionType: AttendanceSessionType;
  topic: string;
  presentCount: number;
  absentCount: number;
  totalCount: number;
  updatedAt: string | null;
};

type LoadResponse = {
  modules: string[];
  session: SessionInfo | null;
  students: AttendanceStudentRow[];
  isExisting?: boolean;
  error?: string;
};

const INTERN_PREFIX = "NIT-INT26-";

function mapMachineEnrollmentToInternId(rawEnNo: string): string | null {
  const digits = rawEnNo.replace(/\D/g, "");
  if (!digits) return null;
  const serial = Number(digits.slice(-4));
  if (!Number.isFinite(serial) || serial < 0) return null;

  const mapped = 1000 + serial;
  if (mapped < 1000 || mapped > 3000) return null;
  return `${INTERN_PREFIX}${mapped}`;
}

function parseMachineAttendanceTxt(content: string, selectedDate: string): Set<string> {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return new Set();

  const presentInternIds = new Set<string>();
  for (const row of lines.slice(1)) {
    const cols = row.split("\t");
    if (cols.length < 10) continue;

    const enNo = cols[2] ?? "";
    const inOut = (cols[6] ?? "").trim();
    const dateTime = (cols[9] ?? "").trim();
    if (inOut !== "1" || !dateTime.startsWith(selectedDate)) continue;

    const mapped = mapMachineEnrollmentToInternId(enNo);
    if (mapped) presentInternIds.add(mapped);
  }
  return presentInternIds;
}

function internIdSortValue(internId: string | null): number | null {
  const normalized = internId?.trim().toUpperCase();
  if (!normalized) return null;
  const match = normalized.match(/(\d+)$/);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

function compareStudentsByInternId(a: AttendanceStudentRow, b: AttendanceStudentRow): number {
  const aNumeric = internIdSortValue(a.internId);
  const bNumeric = internIdSortValue(b.internId);

  if (aNumeric !== null && bNumeric !== null && aNumeric !== bNumeric) {
    return aNumeric - bNumeric;
  }
  if (aNumeric !== null && bNumeric === null) return -1;
  if (aNumeric === null && bNumeric !== null) return 1;

  const aIntern = a.internId?.trim().toUpperCase() ?? "";
  const bIntern = b.internId?.trim().toUpperCase() ?? "";
  const internCompare = aIntern.localeCompare(bIntern);
  if (internCompare !== 0) return internCompare;

  return a.fullName.localeCompare(b.fullName);
}

export function AdminAttendance() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [modules, setModules] = useState<string[]>([]);
  const [date, setDate] = useState(today);
  const [moduleName, setModuleName] = useState("");
  const [sessionType, setSessionType] = useState<AttendanceSessionType>("theory");
  const [topic, setTopic] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [students, setStudents] = useState<AttendanceStudentRow[]>([]);
  const [isExisting, setIsExisting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkInfo, setBulkInfo] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [deletedFlash, setDeletedFlash] = useState(false);

  useTopLoading(loading || loadingStudents || saving || deleting);

  const loadModules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/attendance");
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const json = (await response.json()) as LoadResponse;
      if (!response.ok) {
        setError(json.error ?? "Failed to load modules.");
        return;
      }
      setModules(json.modules ?? []);
    } catch {
      setError("Network error while loading modules.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadSession = useCallback(async () => {
    if (!date || !moduleName || !sessionType) {
      return;
    }

    setLoadingStudents(true);
    setError(null);
    setBulkInfo(null);
    setSavedFlash(false);

    const params = new URLSearchParams({
      date,
      module: moduleName,
      sessionType,
    });

    try {
      const response = await fetch(`/api/admin/attendance?${params.toString()}`);
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const json = (await response.json()) as LoadResponse;
      if (!response.ok) {
        setError(json.error ?? "Failed to load students.");
        return;
      }

      setModules(json.modules ?? []);
      setStudents(json.students ?? []);
      setIsExisting(Boolean(json.isExisting));
      setSessionId(json.session?.id ?? null);
      setTopic(json.session?.topic ?? "");
    } catch {
      setError("Network error while loading attendance.");
    } finally {
      setLoadingStudents(false);
    }
  }, [date, moduleName, sessionType, router]);

  useEffect(() => {
    void loadModules();
  }, [loadModules]);

  useEffect(() => {
    if (!date || !moduleName || !sessionType) {
      setStudents([]);
      setSessionId(null);
      setIsExisting(false);
      setTopic("");
      return;
    }

    void loadSession();
  }, [date, moduleName, sessionType, loadSession]);

  function setStudentStatus(id: string, status: AttendanceStatus) {
    setStudents((prev) => prev.map((student) => (student.id === id ? { ...student, status } : student)));
  }

  function markAll(status: AttendanceStatus) {
    setStudents((prev) => prev.map((student) => ({ ...student, status })));
  }

  async function handleBulkAttendanceFile(file: File) {
    if (!date || !moduleName || !sessionType) {
      setError("Select date, module, and session before uploading attendance TXT.");
      return;
    }
    if (students.length === 0) {
      setError("Load roster before uploading attendance TXT.");
      return;
    }

    setError(null);
    setBulkInfo(null);

    try {
      const text = await file.text();
      const presentInternIds = parseMachineAttendanceTxt(text, date);
      if (presentInternIds.size === 0) {
        setBulkInfo("No valid punches found in TXT for selected date.");
        return;
      }

      let matched = 0;
      setStudents((prev) =>
        prev.map((student) => {
          const normalizedInternId = student.internId?.trim().toUpperCase() ?? "";
          const isPresent = normalizedInternId ? presentInternIds.has(normalizedInternId) : false;
          if (isPresent) matched += 1;
          return { ...student, status: isPresent ? "present" : "absent" };
        }),
      );

      const unmatched = presentInternIds.size - matched;
      setBulkInfo(
        `Bulk TXT attendance applied: ${matched} matched as present, ${unmatched > 0 ? `${unmatched} unmatched` : "0 unmatched"}.`,
      );
    } catch {
      setError("Failed to parse attendance TXT.");
    }
  }

  async function handleSave() {
    if (!date || !moduleName || !sessionType) {
      setError("Please select date, module, and session type.");
      return;
    }
    if (!topic.trim()) {
      setError("Please enter the topic covered.");
      return;
    }
    if (students.length === 0) {
      setError("Load students before saving attendance.");
      return;
    }

    setSaving(true);
    setError(null);
    setSavedFlash(false);

    try {
      const response = await fetch("/api/admin/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionId ?? undefined,
          date,
          module: moduleName,
          sessionType,
          topic: topic.trim(),
          records: students.map((student) => ({
            applicationId: student.id,
            status: student.status ?? "present",
          })),
        }),
      });

      const json = (await response.json()) as { session?: SessionInfo; error?: string };

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      if (!response.ok || !json.session) {
        setError(json.error ?? "Failed to save attendance.");
        return;
      }

      setSessionId(json.session.id);
      setIsExisting(true);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 4000);
    } catch {
      setError("Network error while saving attendance.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isExisting) return;

    const label = `${formatAttendanceSessionLabel(sessionType)} · ${moduleName} · ${date}`;
    const confirmed = window.confirm(
      `Delete this attendance session?\n\n${label}\n\nThis removes attendance for all students in this session. This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    setBulkInfo(null);
    setSavedFlash(false);
    setDeletedFlash(false);

    const params = new URLSearchParams();
    if (sessionId) {
      params.set("id", sessionId);
    } else {
      params.set("date", date);
      params.set("module", moduleName);
      params.set("sessionType", sessionType);
    }

    try {
      const response = await fetch(`/api/admin/attendance?${params.toString()}`, { method: "DELETE" });
      const json = (await response.json()) as { error?: string };

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      if (!response.ok) {
        setError(json.error ?? "Failed to delete attendance session.");
        return;
      }

      setSessionId(null);
      setIsExisting(false);
      setTopic("");
      setDeletedFlash(true);
      setTimeout(() => setDeletedFlash(false), 4000);
      await loadSession();
    } catch {
      setError("Network error while deleting attendance.");
    } finally {
      setDeleting(false);
    }
  }

  const presentCount = students.filter((student) => student.status === "present").length;
  const absentCount = students.filter((student) => student.status === "absent").length;
  const rosterReady = students.length > 0;
  const sortedStudents = useMemo(
    () => [...students].sort(compareStudentsByInternId),
    [students],
  );

  return (
    <section className="admin-attendance">
      <p className="admin-attendance-lead">
        Mark attendance by date, training module, and session type (theory or lab are recorded separately). The student
        list loads automatically when all three are selected. You can reopen and edit any saved session anytime, or delete
        a session if attendance was marked by mistake.
      </p>

      <div className="admin-filters admin-attendance-setup">
        <div className="admin-filters-row">
          <div className="form-field">
            <label htmlFor="attendance-date">Date</label>
            <input
              id="attendance-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="attendance-module">Module</label>
            <select
              id="attendance-module"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              required
            >
              <option value="">Select module</option>
              {modules.map((moduleOption) => (
                <option key={moduleOption} value={moduleOption}>
                  {moduleOption}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="attendance-type">Session</label>
            <select
              id="attendance-type"
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value as AttendanceSessionType)}
              required
            >
              <option value="theory">Theory</option>
              <option value="lab">Lab</option>
            </select>
          </div>
        </div>
        {loadingStudents ? (
          <p className="admin-attendance-auto-loading" role="status">
            Loading students…
          </p>
        ) : null}
        {!loadingStudents && moduleName ? (
          <p className="admin-attendance-auto-loading admin-attendance-auto-ready" role="status">
            Showing roster for {formatAttendanceSessionLabel(sessionType)} · {moduleName} · {date}
          </p>
        ) : null}
      </div>

      {rosterReady ? (
        <>
          <div className="admin-attendance-meta">
            <span className="admin-attendance-pill">
              {formatAttendanceSessionLabel(sessionType)} · {moduleName} · {date}
            </span>
            {isExisting ? (
              <span className="admin-attendance-pill admin-attendance-pill-saved">Saved session — editing</span>
            ) : (
              <span className="admin-attendance-pill admin-attendance-pill-new">New session</span>
            )}
          </div>

          <div className="form-field admin-attendance-topic">
            <label htmlFor="attendance-topic">Topic covered</label>
            <input
              id="attendance-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter topic taught in this session"
              disabled={saving}
              required
            />
          </div>

          <div className="admin-attendance-toolbar">
            <div className="admin-attendance-counts">
              <span>Present: {presentCount}</span>
              <span>Absent: {absentCount}</span>
              <span>Total: {students.length}</span>
            </div>
            <div className="admin-attendance-bulk">
              <label className="btn btn-secondary btn-sm" htmlFor="attendance-bulk-txt">
                Upload machine TXT
              </label>
              <input
                id="attendance-bulk-txt"
                type="file"
                accept=".txt,text/plain"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleBulkAttendanceFile(file);
                  e.target.value = "";
                }}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => markAll("present")}>
                Mark all present
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => markAll("absent")}>
                Mark all absent
              </button>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table admin-attendance-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Intern ID</th>
                  <th>Name</th>
                  <th>College</th>
                  <th>Mobile</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((student, index) => (
                  <tr
                    key={student.id}
                    className={
                      student.status === "absent"
                        ? "admin-attendance-row-absent"
                        : "admin-attendance-row-present"
                    }
                  >
                    <td>{index + 1}</td>
                    <td>{student.internId || "—"}</td>
                    <td>{student.fullName}</td>
                    <td>{student.collegeName}</td>
                    <td>{student.phoneNumber}</td>
                    <td>
                      <div className="admin-attendance-status-toggle">
                        <button
                          type="button"
                          className={`btn btn-sm${student.status === "present" ? " btn-green" : " btn-secondary"}`}
                          onClick={() => setStudentStatus(student.id, "present")}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm${student.status === "absent" ? " btn-red" : " btn-secondary"}`}
                          onClick={() => setStudentStatus(student.id, "absent")}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-filters-actions admin-attendance-save-actions">
            <button type="button" className="btn btn-green btn-sm" onClick={() => void handleSave()} disabled={saving || deleting}>
              {saving ? "Saving…" : isExisting ? "Update attendance" : "Save attendance"}
            </button>
            {isExisting ? (
              <button
                type="button"
                className="btn btn-red btn-sm"
                onClick={() => void handleDelete()}
                disabled={saving || deleting}
              >
                {deleting ? "Deleting…" : "Delete session"}
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {loading ? <p className="admin-loading">Loading modules…</p> : null}
      {savedFlash ? (
        <p className="admin-attendance-saved" role="status">
          Attendance saved successfully.
        </p>
      ) : null}
      {deletedFlash ? (
        <p className="admin-attendance-saved" role="status">
          Attendance session deleted.
        </p>
      ) : null}
      {bulkInfo ? (
        <p className="admin-attendance-saved" role="status">
          {bulkInfo}
        </p>
      ) : null}
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
