"use client";

import { useEffect, useState } from "react";
import {
  COLLEGE_DROPDOWN_OPTIONS,
  COLLEGE_OTHER,
  inferCollegeDropdown,
  type GovernmentCollege,
} from "@/lib/government-colleges";
import { GENDER_OPTIONS } from "@/lib/gender";
import { formatAadharDisplay, isProfileComplete, normalizeAadhar } from "@/lib/profile";
import { authHeaders } from "@/lib/student-session-client";
import type { Application } from "@/types/application";
import { useTopLoading } from "@/components/TopLoadingProvider";

type Props = {
  application: Application;
  onUpdated: (application: Application) => void;
};

type EditableProfile = {
  fullName: string;
  fatherName: string;
  schoolName: string;
  address: string;
  gender: string;
  aadharNumber: string;
  collegeRegistrationNumber: string;
  collegeDropdown: GovernmentCollege | "";
  otherCollegeName: string;
};

function toEditable(application: Application): EditableProfile {
  const collegeDropdown = inferCollegeDropdown(application.collegeName);
  return {
    fullName: application.fullName,
    fatherName: application.fatherName,
    schoolName: application.schoolName,
    address: application.address,
    gender: application.gender ?? "",
    aadharNumber: application.aadharNumber ?? "",
    collegeRegistrationNumber: application.collegeRegistrationNumber ?? "",
    collegeDropdown,
    otherCollegeName: collegeDropdown === COLLEGE_OTHER ? application.collegeName : "",
  };
}

export function StudentProfileEditor({ application, onUpdated }: Props) {
  const profileComplete = isProfileComplete(application);
  const [editing, setEditing] = useState(!profileComplete);
  const [previousCollegeName, setPreviousCollegeName] = useState(application.collegeName);
  const [form, setForm] = useState<EditableProfile>(toEditable(application));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useTopLoading(saving);

  useEffect(() => {
    if (!editing) {
      setForm(toEditable(application));
    }
  }, [application, editing]);

  useEffect(() => {
    if (!profileComplete) {
      setPreviousCollegeName(application.collegeName);
      setEditing(true);
    }
  }, [application.collegeName, profileComplete]);

  function startEditing() {
    setPreviousCollegeName(application.collegeName);
    setForm(toEditable(application));
    setEditing(true);
    setError(null);
  }

  async function handleSave() {
    if (
      !form.fullName.trim() ||
      !form.fatherName.trim() ||
      !form.schoolName.trim() ||
      !form.address.trim() ||
      !form.collegeDropdown ||
      !form.gender ||
      !form.aadharNumber.trim() ||
      !form.collegeRegistrationNumber.trim()
    ) {
      setError("Please fill all required fields.");
      return;
    }

    if (form.collegeDropdown === COLLEGE_OTHER && !form.otherCollegeName.trim()) {
      setError("Please enter your college name when selecting Other.");
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
        body: JSON.stringify({
          fullName: form.fullName,
          fatherName: form.fatherName,
          schoolName: form.schoolName,
          address: form.address,
          gender: form.gender,
          aadharNumber: normalizeAadhar(form.aadharNumber),
          collegeRegistrationNumber: form.collegeRegistrationNumber,
          collegeDropdown: form.collegeDropdown,
          otherCollegeName: form.otherCollegeName,
        }),
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
        Keep your personal details accurate for certificate generation. Select your government polytechnic from the
        list so college names stay consistent. Branch and module are locked.
      </p>

      {!profileComplete ? (
        <div className="accommodation-notice accommodation-notice-warning" role="status">
          Action required: verify your college from the official list and complete Aadhaar, gender, and college
          registration number.
        </div>
      ) : null}

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
              <dt>College registration no.</dt>
              <dd>{application.collegeRegistrationNumber || "—"}</dd>
            </div>
            <div>
              <dt>Aadhaar</dt>
              <dd>
                {application.aadharNumber ? formatAadharDisplay(application.aadharNumber) : "—"}
              </dd>
            </div>
            <div>
              <dt>Gender</dt>
              <dd>{application.gender || "—"}</dd>
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
            <button type="button" className="btn btn-secondary btn-sm" onClick={startEditing}>
              Edit profile
            </button>
          </div>
        </>
      ) : (
        <div className="accommodation-options">
          <div className="accommodation-notice accommodation-notice-info">
            <strong>Previous college on record:</strong> {previousCollegeName}
          </div>

          <div className="shortlist-form compact-form">
            <div className="shortlist-form-row">
              <div className="form-field">
                <label htmlFor="profile-name">Name</label>
                <input
                  id="profile-name"
                  value={form.fullName}
                  onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  disabled={saving}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="profile-father">Father / guardian</label>
                <input
                  id="profile-father"
                  value={form.fatherName}
                  onChange={(e) => setForm((prev) => ({ ...prev, fatherName: e.target.value }))}
                  disabled={saving}
                  required
                />
              </div>
            </div>

            <fieldset className="accommodation-gender-fieldset">
              <legend>Select your government polytechnic</legend>
              <div className="form-field">
                <select
                  id="profile-college-dropdown"
                  aria-label="Government polytechnic"
                  value={form.collegeDropdown}
                  onChange={(e) => {
                    const value = e.target.value as GovernmentCollege | "";
                    setForm((prev) => ({
                      ...prev,
                      collegeDropdown: value,
                      otherCollegeName:
                        value === COLLEGE_OTHER && !prev.otherCollegeName
                          ? previousCollegeName
                          : value === COLLEGE_OTHER
                            ? prev.otherCollegeName
                            : "",
                    }));
                  }}
                  disabled={saving}
                  required
                >
                  <option value="">Choose from the list</option>
                  {COLLEGE_DROPDOWN_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {form.collegeDropdown === COLLEGE_OTHER ? (
                <div className="form-field">
                  <label htmlFor="profile-college-other">College name (Other)</label>
                  <input
                    id="profile-college-other"
                    value={form.otherCollegeName}
                    onChange={(e) => setForm((prev) => ({ ...prev, otherCollegeName: e.target.value }))}
                    disabled={saving}
                    placeholder="Enter your college name"
                    required
                  />
                </div>
              ) : null}
            </fieldset>

            <div className="shortlist-form-row">
              <div className="form-field">
                <label htmlFor="profile-reg-no">College registration number</label>
                <input
                  id="profile-reg-no"
                  value={form.collegeRegistrationNumber}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, collegeRegistrationNumber: e.target.value }))
                  }
                  disabled={saving}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="profile-aadhar">Aadhaar number</label>
                <input
                  id="profile-aadhar"
                  value={form.aadharNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, aadharNumber: e.target.value }))}
                  disabled={saving}
                  inputMode="numeric"
                  placeholder="12-digit Aadhaar"
                  required
                />
              </div>
            </div>

            <fieldset className="accommodation-gender-fieldset">
              <legend>Gender</legend>
              <div className="accommodation-gender-options">
                {GENDER_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className={`accommodation-option accommodation-option-compact${form.gender === option ? " selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="profile-gender"
                      checked={form.gender === option}
                      onChange={() => setForm((prev) => ({ ...prev, gender: option }))}
                      disabled={saving}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="form-field">
              <label htmlFor="profile-school">School</label>
              <input
                id="profile-school"
                value={form.schoolName}
                onChange={(e) => setForm((prev) => ({ ...prev, schoolName: e.target.value }))}
                disabled={saving}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="profile-address">Address</label>
              <input
                id="profile-address"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                disabled={saving}
                required
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
          </div>

          <div className="accommodation-actions">
            <button type="button" className="btn btn-green btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </button>
            {profileComplete ? (
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
            ) : null}
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
