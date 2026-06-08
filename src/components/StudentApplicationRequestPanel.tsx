"use client";

import { useEffect, useState } from "react";
import { authHeaders } from "@/lib/student-session-client";

type RequestItem = {
  id: string;
  requestText: string;
  status: "pending" | "approved" | "rejected";
  adminRemark: string | null;
  reviewedByEmail: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
};

function statusClass(status: RequestItem["status"]): string {
  if (status === "approved") return "status-approved";
  if (status === "rejected") return "status-rejected";
  return "status-pending";
}

export function StudentApplicationRequestPanel() {
  const [requestText, setRequestText] = useState("");
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/applications/application-requests", {
        headers: authHeaders(),
      });
      const json = (await response.json()) as { items?: RequestItem[]; error?: string };
      if (!response.ok) {
        setError(json.error ?? "Failed to load application requests.");
        return;
      }
      setItems(json.items ?? []);
    } catch {
      setError("Network error while loading application requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function submitRequest(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/applications/application-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ requestText }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error ?? "Failed to submit application request.");
        return;
      }
      setRequestText("");
      setSuccess("Application request submitted. Status is pending.");
      await loadItems();
    } catch {
      setError("Network error while submitting request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-result-placeholder">
      <h4>Written Application Request</h4>
      <p>Submit your written application request here. Admin will approve or reject it.</p>

      <form onSubmit={submitRequest} className="student-feedback-form">
        <div className="form-field">
          <label htmlFor="student-written-application">Application text</label>
          <textarea
            id="student-written-application"
            rows={5}
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            placeholder="Write your application in detail..."
            required
            disabled={saving}
          />
        </div>
        <button type="submit" className="btn btn-green btn-sm" disabled={saving}>
          {saving ? "Submitting..." : "Submit application"}
        </button>
      </form>

      {success ? <p className="accommodation-saved">{success}</p> : null}
      {error ? <p className="accommodation-error">{error}</p> : null}

      <div className="student-feedback-list">
        <h5>Your application requests</h5>
        {loading ? <p>Loading...</p> : null}
        {!loading && items.length === 0 ? <p>No application requests submitted yet.</p> : null}
        {!loading &&
          items.map((item) => (
            <article key={item.id} className="student-feedback-item">
              <p>{item.requestText}</p>
              <p>
                <strong>Status:</strong> <span className={statusClass(item.status)}>{item.status}</span>
              </p>
              {item.adminRemark ? (
                <p>
                  <strong>Admin remark:</strong> {item.adminRemark}
                </p>
              ) : null}
              <small>
                Submitted: {item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : "—"}
                {item.reviewedAt ? ` | Reviewed: ${new Date(item.reviewedAt).toLocaleString("en-IN")}` : ""}
              </small>
            </article>
          ))}
      </div>
    </div>
  );
}
