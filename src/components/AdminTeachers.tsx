"use client";

import { useState, useEffect, useCallback } from "react";
import { useTopLoading } from "@/components/TopLoadingProvider";
import { trainingCourses } from "@/lib/content";

type AssignedModule = { subject: string; subpart: string };

type TeacherForm = {
  id: string | null;
  fullName: string;
  email: string;
  phoneNumber: string;
  assignedModules: AssignedModule[];
};

const DEFAULT_FORM: TeacherForm = {
  id: null,
  fullName: "",
  email: "",
  phoneNumber: "",
  assignedModules: [],
};

type AdminTeachersProps = {
  refreshToken?: number;
};

export function AdminTeachers({ refreshToken = 0 }: AdminTeachersProps) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<TeacherForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  // Temporary state for adding a module to the form
  const [tempSubject, setTempSubject] = useState("");
  const [tempSubpart, setTempSubpart] = useState("");

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teachers");
      if (!res.ok) throw new Error("Failed to load teachers");
      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers, refreshToken]);

  useTopLoading(loading || saving);

  function handleAddModule() {
    if (!tempSubject.trim() || !tempSubpart.trim()) return;
    setForm((prev) => ({
      ...prev,
      assignedModules: [...prev.assignedModules, { subject: tempSubject.trim(), subpart: tempSubpart.trim() }],
    }));
    setTempSubject("");
    setTempSubpart("");
  }

  function handleRemoveModule(index: number) {
    setForm((prev) => ({
      ...prev,
      assignedModules: prev.assignedModules.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/teachers", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save teacher");
      
      setShowModal(false);
      setForm(DEFAULT_FORM);
      loadTeachers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function parseBulkInput(text: string): Array<Record<string, string>> {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const rows = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (rows.length < 2) {
      throw new Error("CSV bulk input must include a header and at least one row.");
    }

    const splitLine = (line: string): string[] => {
      const out: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          out.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      out.push(current.trim());
      return out;
    };

    const headers = splitLine(rows[0]).map((value) => value.toLowerCase());
    return rows.slice(1).map((line) => {
      const cols = splitLine(line);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = cols[index] ?? "";
      });
      return row;
    });
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBulkSaving(true);
    setError(null);
    try {
      const rows = parseBulkInput(bulkInput);
      if (!rows.length) {
        setError("Bulk input is empty.");
        return;
      }
      const teachersToCreate = rows.map((row) => ({
        fullName: row.fullname || row.name || "",
        email: row.email || "",
        phoneNumber: row.phonenumber || row.phone || row.mobile || "",
        assignedModules: (row.modules || row.assignedmodules || "").split(";").filter(Boolean).map(mod => {
          const [subject, subpart] = mod.split(":");
          return { subject: (subject || "").trim(), subpart: (subpart || "").trim() };
        })
      }));

      // Post teachers one by one or create a bulk endpoint
      // To keep it simple without changing the backend API right now, we can iterate
      for (const t of teachersToCreate) {
        const res = await fetch("/api/admin/teachers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(t),
        });
        if (!res.ok) {
          const data = await res.json();
          console.error("Failed to add teacher:", data.error);
        }
      }

      setBulkInput("");
      setShowBulkModal(false);
      loadTeachers();
    } catch (err: any) {
      setError(err.message || "Failed to parse bulk input.");
    } finally {
      setBulkSaving(false);
    }
  }

  function handleEdit(teacher: { _id: string; fullName: string; email: string; phoneNumber: string; assignedModules?: AssignedModule[] }) {
    setForm({
      id: teacher._id,
      fullName: teacher.fullName,
      email: teacher.email,
      phoneNumber: teacher.phoneNumber,
      assignedModules: teacher.assignedModules || [],
    });
    setShowModal(true);
  }

  const totalModules = teachers.reduce((sum, t) => sum + (t.assignedModules?.length ?? 0), 0);
  const searchLower = search.trim().toLowerCase();
  const filteredTeachers = searchLower
    ? teachers.filter(
        (t) =>
          t.fullName?.toLowerCase().includes(searchLower) ||
          t.email?.toLowerCase().includes(searchLower) ||
          t.phoneNumber?.includes(search.trim()),
      )
    : teachers;

  return (
    <>
      <div className="admin-stats">
        <div className="admin-stat-card">
          <span className="admin-stat-value">{teachers.length}</span>
          <span className="admin-stat-label">Registered teachers</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-value">{totalModules}</span>
          <span className="admin-stat-label">Module assignments</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-value">{filteredTeachers.length}</span>
          <span className="admin-stat-label">Matching records</span>
        </div>
      </div>

      <div className="admin-application-toolbar">
        <button
          type="button"
          className="btn btn-green btn-sm"
          onClick={() => {
            setForm(DEFAULT_FORM);
            setShowModal(true);
          }}
        >
          Add teacher
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setBulkInput("");
            setShowBulkModal(true);
          }}
        >
          Bulk add
        </button>
      </div>

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <form
        className="admin-filters"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="admin-filters-row">
          <div className="form-field admin-field-full">
            <label htmlFor="teacher-search">Search</label>
            <input
              id="teacher-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, or phone"
            />
          </div>
        </div>
        <p className="admin-muted">
          Teachers sign in at <code>/teacher-portal/login</code> (not linked on the public site).
        </p>
        <div className="admin-filters-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSearch("")}>
            Clear
          </button>
        </div>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Assigned modules</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>Loading teachers…</td>
              </tr>
            ) : filteredTeachers.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  {teachers.length === 0 ? "No teachers registered yet." : "No teachers match your search."}
                </td>
              </tr>
            ) : (
              filteredTeachers.map((t) => (
                <tr key={t._id}>
                  <td><strong>{t.fullName}</strong></td>
                  <td>{t.email}</td>
                  <td>{t.phoneNumber}</td>
                  <td>
                    {(t.assignedModules?.length ?? 0) === 0 ? (
                      <span className="admin-muted">—</span>
                    ) : (
                      t.assignedModules.map((m: AssignedModule, i: number) => (
                        <span key={i} className="admin-module-tag">
                          {m.subject} — {m.subpart}
                        </span>
                      ))
                    )}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => handleEdit(t)}>
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal ? (
        <div className="admin-modal-backdrop" onClick={() => !saving && setShowModal(false)}>
          <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-subhead">{form.id ? "Edit teacher" : "Add teacher"}</h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Close
              </button>
            </div>
            <form className="admin-modal-body" onSubmit={handleSubmit}>
              <div className="admin-form-grid-two">
                <div className="form-field admin-field-full">
                  <label htmlFor="teacher-full-name">Full name</label>
                  <input
                    id="teacher-full-name"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    disabled={saving}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="teacher-email">Email</label>
                  <input
                    id="teacher-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    disabled={saving}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="teacher-phone">Phone number</label>
                  <input
                    id="teacher-phone"
                    type="tel"
                    required
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="admin-filters admin-module-picker">
                <h3 className="admin-subhead">Assigned modules</h3>
                <div className="admin-filters-row">
                  <div className="form-field">
                    <label htmlFor="teacher-subject">Branch (subject)</label>
                    <select
                      id="teacher-subject"
                      value={tempSubject}
                      onChange={(e) => {
                        setTempSubject(e.target.value);
                        setTempSubpart("");
                      }}
                      disabled={saving}
                    >
                      <option value="">Select branch</option>
                      {Object.keys(trainingCourses).map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="teacher-subpart">Module (subpart)</label>
                    <select
                      id="teacher-subpart"
                      value={tempSubpart}
                      onChange={(e) => setTempSubpart(e.target.value)}
                      disabled={!tempSubject || saving}
                    >
                      <option value="">Select module</option>
                      {tempSubject &&
                        (trainingCourses[tempSubject as keyof typeof trainingCourses] ?? []).map((mod) => (
                          <option key={mod} value={mod}>
                            {mod}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="form-field admin-module-add-field">
                    <label>&nbsp;</label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddModule} disabled={saving}>
                      Add module
                    </button>
                  </div>
                </div>
                {form.assignedModules.length === 0 ? (
                  <p className="admin-muted">No modules assigned yet.</p>
                ) : (
                  <ul className="admin-module-list">
                    {form.assignedModules.map((m, i) => (
                      <li key={`${m.subject}-${m.subpart}-${i}`}>
                        <span>{m.subject} — {m.subpart}</span>
                        <button type="button" className="admin-icon-btn admin-icon-btn-danger" onClick={() => handleRemoveModule(i)} disabled={saving}>
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="admin-filters-actions">
                <button type="submit" className="btn btn-green btn-sm" disabled={saving}>
                  {saving ? "Saving…" : form.id ? "Update teacher" : "Save teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showBulkModal ? (
        <div className="admin-modal-backdrop" onClick={() => !bulkSaving && setShowBulkModal(false)}>
          <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-subhead">Bulk add teachers</h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowBulkModal(false)}
                disabled={bulkSaving}
              >
                Close
              </button>
            </div>
            <form className="admin-modal-body" onSubmit={handleBulkSubmit}>
              <p className="admin-muted">
                Paste CSV with headers: <code>fullName, email, phoneNumber, modules</code>.
                Separate multiple modules with <code>;</code> as <code>Subject:Subpart</code>.
              </p>
              <div className="form-field">
                <label htmlFor="teacher-bulk-csv">CSV content</label>
                <textarea
                  id="teacher-bulk-csv"
                  rows={10}
                  required
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  disabled={bulkSaving}
                  placeholder={"fullName, email, phoneNumber, modules\nJohn Doe, john@example.com, 9876543210, Computer Science and Engineering:Python Programming"}
                />
              </div>
              <div className="admin-filters-actions">
                <button type="submit" className="btn btn-green btn-sm" disabled={bulkSaving}>
                  {bulkSaving ? "Adding…" : "Bulk add teachers"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
