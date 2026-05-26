"use client";

import { useState } from "react";
import { authHeaders } from "@/lib/student-session-client";
import type { Application } from "@/types/application";

type Props = {
  application: Application;
  onUpdated: (application: Application) => void;
};

export function AccommodationEnrollment({ application, onUpdated }: Props) {
  const [editing, setEditing] = useState(application.wantsAccommodation == null);
  const [choice, setChoice] = useState<boolean | null>(application.wantsAccommodation ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const enrolled = application.wantsAccommodation !== null && application.wantsAccommodation !== undefined;

  async function handleSave() {
    if (choice === null) {
      setError("Please select whether you need hostel accommodation.");
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
        body: JSON.stringify({ wantsAccommodation: choice }),
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
            {application.wantsAccommodation ? "Enrolled: Hostel required" : "Enrolled: No hostel required"}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setChoice(application.wantsAccommodation ?? null);
              setEditing(true);
              setError(null);
            }}
          >
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
              onChange={() => setChoice(true)}
              disabled={saving}
            />
            <span>
              <strong>Yes</strong> — I need hostel accommodation
            </span>
          </label>
          <label className={`accommodation-option${choice === false ? " selected" : ""}`}>
            <input
              type="radio"
              name="wantsAccommodation"
              checked={choice === false}
              onChange={() => setChoice(false)}
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
              disabled={saving || choice === null}
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
