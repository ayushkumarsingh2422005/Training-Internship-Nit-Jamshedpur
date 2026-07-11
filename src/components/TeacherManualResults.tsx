"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { authHeaders } from "@/lib/teacher-session-client";
import { IconActionButton, IconActionGroup } from "@/components/IconActionButton";

type AssignedModule = { subject: string; subpart: string };

type ManualExam = {
  _id: string;
  examName: string;
  subject: string;
  subpart: string;
  examType: "Theory" | "Lab" | "Other";
  maxMarks: number;
  examDate?: string | null;
  notes?: string;
  resultCount?: number;
  createdAt?: string;
};

type RosterStudent = {
  id: string;
  fullName: string;
  email: string;
  internId: string | null;
  collegeName: string;
  score: number | null;
  remarks: string;
  resultId: string | null;
};

type TeacherManualResultsProps = {
  teacher: { assignedModules?: AssignedModule[] };
};

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function TeacherManualResults({ teacher }: TeacherManualResultsProps) {
  const modules = teacher.assignedModules ?? [];
  const [exams, setExams] = useState<ManualExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [view, setView] = useState<"list" | "create" | "edit" | "scores">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    examName: "",
    moduleIndex: 0,
    examType: "Theory" as "Theory" | "Lab" | "Other",
    maxMarks: 100,
    examDate: "",
    notes: "",
  });

  const [activeExam, setActiveExam] = useState<ManualExam | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [remarkDrafts, setRemarkDrafts] = useState<Record<string, string>>({});
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterFilter, setRosterFilter] = useState("");

  const resetForm = useCallback(() => {
    setForm({
      examName: "",
      moduleIndex: 0,
      examType: "Theory",
      maxMarks: 100,
      examDate: "",
      notes: "",
    });
    setEditingId(null);
  }, []);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teachers/manual-exams", { headers: authHeaders() });
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
    void fetchExams();
  }, [fetchExams]);

  const enteredCount = useMemo(
    () => Object.values(scoreDrafts).filter((v) => v.trim() !== "").length,
    [scoreDrafts],
  );

  const filteredRoster = useMemo(() => {
    const q = rosterFilter.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.internId || "").toLowerCase().includes(q),
    );
  }, [roster, rosterFilter]);

  async function openScores(exam: ManualExam) {
    setActiveExam(exam);
    setView("scores");
    setRosterLoading(true);
    setError(null);
    setRosterFilter("");
    try {
      const res = await fetch(
        `/api/teachers/manual-exams/roster?manualExamId=${encodeURIComponent(exam._id)}`,
        { headers: authHeaders() },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load students");
      const students: RosterStudent[] = data.students || [];
      setRoster(students);
      setActiveExam(data.exam || exam);
      const scores: Record<string, string> = {};
      const remarks: Record<string, string> = {};
      for (const s of students) {
        scores[s.id] = s.score == null ? "" : String(s.score);
        remarks[s.id] = s.remarks || "";
      }
      setScoreDrafts(scores);
      setRemarkDrafts(remarks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students");
      setView("list");
    } finally {
      setRosterLoading(false);
    }
  }

  function startCreate() {
    resetForm();
    setView("create");
  }

  function startEdit(exam: ManualExam) {
    const moduleIndex = Math.max(
      0,
      modules.findIndex((m) => m.subject === exam.subject && m.subpart === exam.subpart),
    );
    setEditingId(exam._id);
    setForm({
      examName: exam.examName,
      moduleIndex,
      examType: exam.examType || "Theory",
      maxMarks: exam.maxMarks,
      examDate: toDateInputValue(exam.examDate),
      notes: exam.notes || "",
    });
    setView("edit");
  }

  async function saveExamMeta(e: FormEvent) {
    e.preventDefault();
    if (!modules.length) {
      setError("No assigned modules. Contact admin.");
      return;
    }
    const selected = modules[form.moduleIndex];
    if (!selected) {
      setError("Select a module.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        id: editingId || undefined,
        examName: form.examName.trim(),
        subject: selected.subject,
        subpart: selected.subpart,
        examType: form.examType,
        maxMarks: Number(form.maxMarks),
        examDate: form.examDate || null,
        notes: form.notes.trim(),
      };

      const res = await fetch("/api/teachers/manual-exams", {
        method: editingId ? "PUT" : "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save exam");

      await fetchExams();
      setView("list");
      resetForm();

      if (!editingId && data.exam) {
        await openScores(data.exam);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save exam");
    } finally {
      setSaving(false);
    }
  }

  async function deleteExam(exam: ManualExam) {
    if (
      !window.confirm(
        `Delete "${exam.examName}" and all entered scores? This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/teachers/manual-exams?id=${encodeURIComponent(exam._id)}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      await fetchExams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function saveScores() {
    if (!activeExam) return;
    setSaving(true);
    setError(null);
    try {
      const results = roster.map((s) => ({
        studentId: s.id,
        score: scoreDrafts[s.id]?.trim() === "" ? null : scoreDrafts[s.id],
        remarks: remarkDrafts[s.id] || "",
      }));

      const res = await fetch("/api/teachers/manual-exams/results", {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ manualExamId: activeExam._id, results }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save scores");

      await openScores(activeExam);
      await fetchExams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save scores");
    } finally {
      setSaving(false);
    }
  }

  if (view === "create" || view === "edit") {
    return (
      <div className="teacher-section-panel">
        <div className="admin-application-toolbar">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              resetForm();
              setView("list");
            }}
          >
            ← Back to list
          </button>
        </div>

        {error ? <p className="admin-error">{error}</p> : null}

        <form className="admin-filters" onSubmit={(e) => void saveExamMeta(e)}>
          <div className="admin-form-grid-two">
            <div className="form-field">
              <label htmlFor="manual-exam-name">Exam name</label>
              <input
                id="manual-exam-name"
                type="text"
                value={form.examName}
                onChange={(e) => setForm({ ...form, examName: e.target.value })}
                placeholder="e.g. Drafting Theory Midterm"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="manual-exam-module">Assigned module</label>
              <select
                id="manual-exam-module"
                value={form.moduleIndex}
                onChange={(e) => setForm({ ...form, moduleIndex: Number(e.target.value) })}
                required
              >
                {modules.length === 0 ? (
                  <option value={0}>No modules assigned</option>
                ) : (
                  modules.map((mod, index) => (
                    <option key={`${mod.subject}-${mod.subpart}-${index}`} value={index}>
                      {mod.subject} — {mod.subpart}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="manual-exam-type">Type</label>
              <select
                id="manual-exam-type"
                value={form.examType}
                onChange={(e) =>
                  setForm({ ...form, examType: e.target.value as "Theory" | "Lab" | "Other" })
                }
              >
                <option value="Theory">Theory</option>
                <option value="Lab">Lab</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="manual-exam-marks">Maximum marks</label>
              <input
                id="manual-exam-marks"
                type="number"
                min={1}
                step="any"
                value={form.maxMarks}
                onChange={(e) => setForm({ ...form, maxMarks: Number(e.target.value) })}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="manual-exam-date">Exam date (optional)</label>
              <input
                id="manual-exam-date"
                type="date"
                value={form.examDate}
                onChange={(e) => setForm({ ...form, examDate: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label htmlFor="manual-exam-notes">Notes (optional)</label>
              <input
                id="manual-exam-notes"
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Conducted offline before CBT"
              />
            </div>
          </div>
          <div className="admin-application-toolbar">
            <button type="submit" className="btn btn-green btn-sm" disabled={saving || !modules.length}>
              {saving ? "Saving…" : editingId ? "Update exam" : "Create & enter scores"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (view === "scores" && activeExam) {
    return (
      <div className="teacher-section-panel">
        <div className="admin-application-toolbar">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setView("list")}>
            ← Back to list
          </button>
          <button
            type="button"
            className="btn btn-green btn-sm"
            onClick={() => void saveScores()}
            disabled={saving || rosterLoading}
          >
            {saving ? "Saving…" : "Save scores"}
          </button>
        </div>

        <p className="admin-muted">
          {activeExam.examName} · {activeExam.examType} · {activeExam.subject} — {activeExam.subpart} ·
          Max {activeExam.maxMarks} · Entered {enteredCount}/{roster.length}
        </p>

        {error ? <p className="admin-error">{error}</p> : null}

        <div className="admin-filters" style={{ marginBottom: "0.75rem" }}>
          <div className="form-field">
            <label htmlFor="roster-filter">Search students</label>
            <input
              id="roster-filter"
              type="search"
              value={rosterFilter}
              onChange={(e) => setRosterFilter(e.target.value)}
              placeholder="Name, email, or intern ID"
            />
          </div>
        </div>

        {rosterLoading ? (
          <p className="admin-loading">Loading students…</p>
        ) : roster.length === 0 ? (
          <p className="admin-empty">No students found for this module.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Intern ID</th>
                  <th>Score / {activeExam.maxMarks}</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <strong>{student.fullName}</strong>
                      <br />
                      <span className="admin-muted">{student.email}</span>
                    </td>
                    <td>{student.internId || "—"}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={activeExam.maxMarks}
                        step="any"
                        value={scoreDrafts[student.id] ?? ""}
                        onChange={(e) =>
                          setScoreDrafts((prev) => ({ ...prev, [student.id]: e.target.value }))
                        }
                        style={{ width: "6.5rem" }}
                        aria-label={`Score for ${student.fullName}`}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={remarkDrafts[student.id] ?? ""}
                        onChange={(e) =>
                          setRemarkDrafts((prev) => ({ ...prev, [student.id]: e.target.value }))
                        }
                        placeholder="Optional"
                        aria-label={`Remarks for ${student.fullName}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="teacher-section-panel">
      <div className="admin-application-toolbar">
        <button type="button" className="btn btn-green btn-sm" onClick={startCreate}>
          + Add past result sheet
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => void fetchExams()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <p className="admin-muted">
        Enter scores for offline theory/lab exams that were conducted outside CBT. Students in the
        selected module appear automatically.
      </p>

      {error ? <p className="admin-error">{error}</p> : null}

      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : exams.length === 0 ? (
        <p className="admin-empty">No manual result sheets yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Module</th>
                <th>Type</th>
                <th>Max marks</th>
                <th>Date</th>
                <th>Scores entered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam._id}>
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
                  <td>
                    <span className="teacher-badge teacher-badge-published">{exam.examType}</span>
                  </td>
                  <td>{exam.maxMarks}</td>
                  <td>
                    {exam.examDate
                      ? new Date(exam.examDate).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                  <td>{exam.resultCount ?? 0}</td>
                  <td>
                    <IconActionGroup>
                      <IconActionButton
                        icon="results"
                        label="Enter or edit scores"
                        text="Scores"
                        showLabel
                        variant="success"
                        size="sm"
                        onClick={() => void openScores(exam)}
                      />
                      <IconActionButton
                        icon="edit"
                        label="Edit exam details"
                        text="Edit"
                        showLabel
                        variant="primary"
                        size="sm"
                        onClick={() => startEdit(exam)}
                      />
                      <IconActionButton
                        icon="delete"
                        label="Delete this result sheet"
                        variant="danger"
                        size="sm"
                        onClick={() => void deleteExam(exam)}
                      />
                    </IconActionGroup>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
