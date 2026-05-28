"use client";

import { useState } from "react";
import { authHeaders } from "@/lib/student-session-client";
import type { Application } from "@/types/application";

type Props = {
  application: Application;
  onUpdated: (application: Application) => void;
};

type EditableProfile = {
  fullName: string;
  fatherName: string;
  schoolName: string;
  collegeName: string;
  address: string;
};

function toEditable(application: Application): EditableProfile {
  return {
    fullName: application.fullName,
    fatherName: application.fatherName,
    schoolName: application.schoolName,
    collegeName: application.collegeName,
    address: application.address,
  };
}

export function StudentProfileEditor({ application, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditableProfile>(toEditable(application));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  async function handleSave() {
    if (!form.fullName.trim() || !form.fatherName.trim() || !form.schoolName.trim() || !form.collegeName.trim() || !form.address.trim()) {
      setError("Please fill all profile fields.");
      return;
    }

    setSaving(true);
    setError(null);
    setSavedFlash(false);

    try {
      const response = await fetch("/api/applications/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { application?: Application; error?: string };

      if (response.status === 401) {
        setError("Session expired. Please log out and sign in again.");
        return;
      }

      if (!response.ok || !data.application) {
        setError(data.error ?? "Could not update profile.");
        return;
      }

      onUpdated(data.application);
      setForm(toEditable(data.application));
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 4000);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="accommodation-block">
      <h4 className="accommodation-title">Basic profile (certificate details)</h4>
      <p className="accommodation-lead">
        Keep your personal details accurate for certificate generation. Branch and module are locked and cannot be changed.
      </p>

      {!editing ? (
        <>
          <dl className="shortlist-details compact-grid">
            <div>
              <dt>Name</dt>
              <dd>{application.fullName}</dd>
            </div>
            <div>
              <dt>Father / guardian</dt>
              <dd>{application.fatherName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{application.email}</dd>
            </div>
            <div>
              <dt>Mobile</dt>
              <dd>{application.phoneNumber}</dd>
            </div>
            <div>
              <dt>College</dt>
              <dd>{application.collegeName}</dd>
            </div>
            <div>
              <dt>School</dt>
              <dd>{application.schoolName}</dd>
            </div>
            <div>
              <dt>Branch (locked)</dt>
              <dd>{application.subject}</dd>
            </div>
            <div>
              <dt>Module (locked)</dt>
              <dd>{application.subpart}</dd>
            </div>
            <div className="compact-grid-full">
              <dt>Address</dt>
              <dd>{application.address}</dd>
            </div>
          </dl>

          <div className="accommodation-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setForm(toEditable(application));
                setEditing(true);
                setError(null);
              }}
            >
              Edit profile
            </button>
          </div>
        </>
      ) : (
        <div className="accommodation-options">
          <div className="shortlist-form-row">
            <div className="form-field">
              <label htmlFor="profile-name">Name</label>
              <input
                id="profile-name"
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="form-field">
              <label htmlFor="profile-father">Father / guardian</label>
              <input
                id="profile-father"
                value={form.fatherName}
                onChange={(e) => setForm((prev) => ({ ...prev, fatherName: e.target.value }))}
                disabled={saving}
              />
            </div>
          </div>
          <div className="shortlist-form-row">
            <div className="form-field">
              <label htmlFor="profile-college">College</label>
              <input
                id="profile-college"
                value={form.collegeName}
                onChange={(e) => setForm((prev) => ({ ...prev, collegeName: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="form-field">
              <label htmlFor="profile-school">School</label>
              <input
                id="profile-school"
                value={form.schoolName}
                onChange={(e) => setForm((prev) => ({ ...prev, schoolName: e.target.value }))}
                disabled={saving}
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="profile-address">Address</label>
            <input
              id="profile-address"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="shortlist-form-row">
            <div className="form-field">
              <label htmlFor="profile-branch">Branch (locked)</label>
              <input id="profile-branch" value={application.subject} disabled />
            </div>
            <div className="form-field">
              <label htmlFor="profile-module">Module (locked)</label>
              <input id="profile-module" value={application.subpart} disabled />
            </div>
          </div>
          <div className="accommodation-actions">
            <button type="button" className="btn btn-green btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setEditing(false);
                setForm(toEditable(application));
                setError(null);
              }}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {savedFlash ? (
        <p className="accommodation-saved" role="status">
          Profile updated successfully.
        </p>
      ) : null}
      {error ? (
        <p className="accommodation-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
