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

export function AdminTeachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
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
  }, [loadTeachers]);

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

  function handleEdit(teacher: any) {
    setForm({
      id: teacher._id,
      fullName: teacher.fullName,
      email: teacher.email,
      phoneNumber: teacher.phoneNumber,
      assignedModules: teacher.assignedModules || [],
    });
    setShowModal(true);
  }

  return (
    <div className="admin-teachers">
      <div className="admin-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2>Teachers Management</h2>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => {
              setBulkInput("");
              setShowBulkModal(true);
            }}
          >
            Bulk Add
          </button>
          <button 
            className="btn btn-green btn-sm" 
            onClick={() => {
              setForm(DEFAULT_FORM);
              setShowModal(true);
            }}
          >
            Add Teacher
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: "1rem", color: "red" }}>{error}</div>}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Assigned Modules</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t._id}>
                <td>{t.fullName}</td>
                <td>{t.email}</td>
                <td>{t.phoneNumber}</td>
                <td>
                  {t.assignedModules.map((m: any, i: number) => (
                    <span key={i} className="badge" style={{ background: "#eee", padding: "2px 6px", marginRight: "4px", borderRadius: "4px", fontSize: "12px" }}>
                      {m.subject} - {m.subpart}
                    </span>
                  ))}
                </td>
                <td>
                  <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(t)}>Edit</button>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && !loading && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center" }}>
                  No teachers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ background: "white", padding: "2rem", borderRadius: "8px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="admin-modal-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 className="admin-subhead">{form.id ? "Edit Teacher" : "Add Teacher"}</h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Close</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-field">
                <label>Full Name</label>
                <input 
                  required 
                  value={form.fullName} 
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })} 
                  style={{ width: "100%", padding: "0.5rem" }}
                />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input 
                  type="email" 
                  required 
                  value={form.email} 
                  onChange={(e) => setForm({ ...form, email: e.target.value })} 
                  style={{ width: "100%", padding: "0.5rem" }}
                />
              </div>
              <div className="form-field">
                <label>Phone Number</label>
                <input 
                  required 
                  value={form.phoneNumber} 
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} 
                  style={{ width: "100%", padding: "0.5rem" }}
                />
              </div>

              <div className="form-field" style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "4px" }}>
                <label style={{ fontWeight: "bold", marginBottom: "0.5rem", display: "block" }}>Assigned Modules</label>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                  <select 
                    value={tempSubject} 
                    onChange={(e) => {
                      setTempSubject(e.target.value);
                      setTempSubpart("");
                    }} 
                    style={{ flex: 1, padding: "0.5rem" }}
                  >
                    <option value="">Select Branch (Subject)</option>
                    {Object.keys(trainingCourses).map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                  <select 
                    value={tempSubpart} 
                    onChange={(e) => setTempSubpart(e.target.value)} 
                    style={{ flex: 1, padding: "0.5rem" }}
                    disabled={!tempSubject}
                  >
                    <option value="">Select Module (Subpart)</option>
                    {tempSubject && (trainingCourses as any)[tempSubject]?.map((mod: string) => (
                      <option key={mod} value={mod}>{mod}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={handleAddModule}>Add</button>
                </div>
                
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {form.assignedModules.map((m, i) => (
                    <li key={i} style={{ display: "flex", justifyContent: "space-between", background: "#f9f9f9", padding: "0.5rem", marginBottom: "0.25rem", borderRadius: "4px" }}>
                      <span>{m.subject} - {m.subpart}</span>
                      <button type="button" onClick={() => handleRemoveModule(i)} style={{ background: "none", border: "none", color: "red", cursor: "pointer" }}>&times;</button>
                    </li>
                  ))}
                  {form.assignedModules.length === 0 && <span style={{ color: "#999", fontSize: "0.9rem" }}>No modules assigned yet.</span>}
                </ul>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="submit" className="btn btn-green" disabled={saving}>
                  {saving ? "Saving..." : "Save Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowBulkModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ background: "white", padding: "2rem", borderRadius: "8px", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="admin-modal-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 className="admin-subhead">Bulk Add Teachers</h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowBulkModal(false)}>Close</button>
            </div>
            
            <form onSubmit={handleBulkSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>
                Paste CSV content with headers: <code>fullName, email, phoneNumber, modules</code>.<br/>
                For modules, separate multiple with a semicolon <code>;</code> and format as <code>Subject:Subpart</code>.<br/>
                Example: <code>Computer Science:Python Programming;Mechanical Engineering:AutoCAD</code>
              </p>
              <div className="form-field">
                <textarea 
                  rows={10} 
                  required 
                  value={bulkInput} 
                  onChange={(e) => setBulkInput(e.target.value)} 
                  style={{ width: "100%", padding: "0.5rem", fontFamily: "monospace" }}
                  placeholder="fullName, email, phoneNumber, modules&#10;John Doe, john@example.com, 1234567890, Computer Science and Engineering:Python Programming"
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="submit" className="btn btn-green" disabled={bulkSaving}>
                  {bulkSaving ? "Adding..." : "Bulk Add Teachers"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
