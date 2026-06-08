"use client";

import { useEffect, useState } from "react";
import { authHeaders } from "@/lib/student-session-client";

type FeedbackItem = {
  id: string;
  message: string;
  createdAt: string | null;
};

export function StudentCourseFeedbackPanel() {
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/applications/course-feedback", {
        headers: authHeaders(),
      });
      const json = (await response.json()) as { items?: FeedbackItem[]; error?: string };
      if (!response.ok) {
        setError(json.error ?? "Failed to load feedback.");
        return;
      }
      setItems(json.items ?? []);
    } catch {
      setError("Network error while loading feedback.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function submitFeedback(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/applications/course-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ message }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error ?? "Failed to submit feedback.");
        return;
      }
      setMessage("");
      setSuccess("Feedback submitted successfully.");
      await loadItems();
    } catch {
      setError("Network error while submitting feedback.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-result-placeholder">
      <h4>Course Feedback</h4>
      <p>Share your course/training feedback. You can submit multiple feedback entries.</p>

      <form onSubmit={submitFeedback} className="student-feedback-form">
        <div className="form-field">
          <label htmlFor="student-course-feedback">Feedback</label>
          <textarea
            id="student-course-feedback"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your feedback..."
            required
            disabled={saving}
          />
        </div>
        <button type="submit" className="btn btn-green btn-sm" disabled={saving}>
          {saving ? "Submitting..." : "Submit feedback"}
        </button>
      </form>

      {success ? <p className="accommodation-saved">{success}</p> : null}
      {error ? <p className="accommodation-error">{error}</p> : null}

      <div className="student-feedback-list">
        <h5>Previous feedback</h5>
        {loading ? <p>Loading...</p> : null}
        {!loading && items.length === 0 ? <p>No feedback submitted yet.</p> : null}
        {!loading &&
          items.map((item) => (
            <article key={item.id} className="student-feedback-item">
              <p>{item.message}</p>
              <small>{item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : "—"}</small>
            </article>
          ))}
      </div>
    </div>
  );
}
