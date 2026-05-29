"use client";

import { useState } from "react";
import { GENDER_OPTIONS } from "@/lib/gender";
import { authHeaders } from "@/lib/student-session-client";
import type { Application } from "@/types/application";
import { useTopLoading } from "@/components/TopLoadingProvider";

type Props = {
  application: Application;
  onUpdated: (application: Application) => void;
};

export function AccommodationEnrollment({ application, onUpdated }: Props) {
  const [editing, setEditing] = useState(application.wantsAccommodation == null);
  const [choice, setChoice] = useState<boolean | null>(application.wantsAccommodation ?? null);
  const [gender, setGender] = useState<string | null>(application.gender ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useTopLoading(saving);

  const enrolled = application.wantsAccommodation !== null && application.wantsAccommodation !== undefined;
  const needsGender = choice === true;

  async function handleSave() {
    if (choice === null) {
      setError("Please select whether you need hostel accommodation.");
      return;
    }

    if (choice === true && !gender) {
      setError("Please select your gender for hostel allocation.");
      return;
    }

    setSaving(true);
    setError(null);
    setSavedFlash(false);

    try {
      const response = await fetch("/api/applications/accommodation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          wantsAccommodation: choice,
          ...(choice === true ? { gender } : {}),
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        application?: Application;
        error?: string;
      };

      if (response.status === 401) {
        setError("Session expired. Please log out and sign in again.");
        return;
      }

      if (!response.ok || !data.application) {
        setError(data.error ?? "Could not save your preference. Please try again.");
        return;
      }

      onUpdated(data.application);
      setGender(data.application.gender ?? null);
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 4000);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    setChoice(application.wantsAccommodation ?? null);
    setGender(application.gender ?? null);
    setEditing(true);
    setError(null);
  }

  return (
    <div className="accommodation-block" style={{ marginBottom: "16px" }}>
      <h4 className="accommodation-title">Hostel accommodation</h4>
      <p className="accommodation-lead">
        Residential training includes optional NIT Jamshedpur hostel &amp; mess (chargeable as per actual rates). Please
        confirm your preference.
      </p>

      {enrolled && !editing ? (
        <div className="accommodation-status-row">
          <span
            className={
              application.wantsAccommodation
                ? "accommodation-badge accommodation-badge-yes"
                : "accommodation-badge accommodation-badge-no"
            }
          >
            {application.wantsAccommodation
              ? `Enrolled: Hostel required${application.gender ? ` (${application.gender})` : ""}`
              : "Enrolled: No hostel required"}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={startEdit}>
            Change
          </button>
        </div>
      ) : (
        <div className="accommodation-options">
          <label className={`accommodation-option${choice === true ? " selected" : ""}`}>
            <input
              type="radio"
              name="wantsAccommodation"
              checked={choice === true}
              onChange={() => {
                setChoice(true);
                setError(null);
              }}
              disabled={saving}
            />
            <span>
              <strong>Yes</strong> — I need hostel accommodation
            </span>
          </label>

          {needsGender ? (
            <fieldset className="accommodation-gender-fieldset">
              <legend>Select your gender (required for hostel)</legend>
              <div className="accommodation-gender-options">
                {GENDER_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className={`accommodation-option accommodation-option-compact${gender === option ? " selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      checked={gender === option}
                      onChange={() => setGender(option)}
                      disabled={saving}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <label className={`accommodation-option${choice === false ? " selected" : ""}`}>
            <input
              type="radio"
              name="wantsAccommodation"
              checked={choice === false}
              onChange={() => {
                setChoice(false);
                setGender(null);
                setError(null);
              }}
              disabled={saving}
            />
            <span>
              <strong>No</strong> — I will arrange my own stay
            </span>
          </label>

          <div className="accommodation-actions">
            <button
              type="button"
              className="btn btn-green btn-sm"
              onClick={handleSave}
              disabled={saving || choice === null || (needsGender && !gender)}
            >
              {saving ? "Saving…" : enrolled ? "Update preference" : "Confirm enrollment"}
            </button>
            {enrolled ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditing(false);
                  setChoice(application.wantsAccommodation ?? null);
                  setGender(application.gender ?? null);
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
          Accommodation preference saved successfully.
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
