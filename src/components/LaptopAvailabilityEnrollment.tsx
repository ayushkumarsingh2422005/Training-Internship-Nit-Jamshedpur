"use client";

import { useState } from "react";
import { authHeaders } from "@/lib/student-session-client";
import type { Application } from "@/types/application";
import { useTopLoading } from "@/components/TopLoadingProvider";

type Props = {
  application: Application;
  onUpdated: (application: Application) => void;
};

export function LaptopAvailabilityEnrollment({ application, onUpdated }: Props) {
  const [editing, setEditing] = useState(application.hasLaptop == null);
  const [choice, setChoice] = useState<boolean | null>(application.hasLaptop ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useTopLoading(saving);

  const submitted = application.hasLaptop === true || application.hasLaptop === false;

  async function handleSave() {
    if (choice == null) {
      setError("Please select whether you have a laptop.");
      return;
    }

    setSaving(true);
    setError(null);
    setSavedFlash(false);

    try {
      const response = await fetch("/api/applications/laptop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ hasLaptop: choice }),
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
        setError(data.error ?? "Could not save your response. Please try again.");
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

  function startEdit() {
    setChoice(application.hasLaptop ?? null);
    setEditing(true);
    setError(null);
  }

  return (
    <div className="accommodation-block">
      <h4 className="accommodation-title">Laptop availability</h4>
      <p className="accommodation-lead">
        Please confirm if you have a personal laptop with you during the training period.
      </p>

      {submitted && !editing ? (
        <div className="accommodation-status-row">
          <span className={application.hasLaptop ? "accommodation-badge accommodation-badge-yes" : "accommodation-badge accommodation-badge-no"}>
            {application.hasLaptop ? "Submitted: Yes, I have a laptop" : "Submitted: No laptop available"}
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
              name="hasLaptop"
              checked={choice === true}
              onChange={() => {
                setChoice(true);
                setError(null);
              }}
              disabled={saving}
            />
            <span>
              <strong>Yes</strong> — I have a laptop
            </span>
          </label>
          <label className={`accommodation-option${choice === false ? " selected" : ""}`}>
            <input
              type="radio"
              name="hasLaptop"
              checked={choice === false}
              onChange={() => {
                setChoice(false);
                setError(null);
              }}
              disabled={saving}
            />
            <span>
              <strong>No</strong> — I do not have a laptop
            </span>
          </label>

          <div className="accommodation-actions">
            <button type="button" className="btn btn-green btn-sm" onClick={handleSave} disabled={saving || choice == null}>
              {saving ? "Saving..." : submitted ? "Update response" : "Submit response"}
            </button>
            {submitted ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditing(false);
                  setChoice(application.hasLaptop ?? null);
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
          Laptop availability saved successfully.
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
