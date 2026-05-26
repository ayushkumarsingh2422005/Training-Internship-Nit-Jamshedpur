"use client";

import { useCallback, useEffect, useState } from "react";
import { AccommodationEnrollment } from "@/components/AccommodationEnrollment";
import {
  authHeaders,
  clearStudentSession,
  getStudentSession,
  saveStudentSession,
} from "@/lib/student-session-client";
import type { Application } from "@/types/application";

type LookupState =
  | { status: "idle" }
  | { status: "restoring" }
  | { status: "loading" }
  | { status: "shortlisted"; application: Application }
  | { status: "not-shortlisted" }
  | { status: "error"; message: string };

const COMPACT_DETAILS: { key: keyof Application; label: string }[] = [
  { key: "fullName", label: "Name" },
  { key: "fatherName", label: "Father / guardian" },
  { key: "email", label: "Email" },
  { key: "phoneNumber", label: "Mobile" },
  { key: "collegeName", label: "College" },
  { key: "schoolName", label: "School" },
  { key: "subject", label: "Branch" },
  { key: "subpart", label: "Module" },
];

export function ShortlistLookup() {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [state, setState] = useState<LookupState>({ status: "restoring" });

  const restoreSession = useCallback(async () => {
    const token = getStudentSession();
    if (!token) {
      setState({ status: "idle" });
      return;
    }

    try {
      const response = await fetch("/api/applications/me", {
        headers: authHeaders(),
      });
      const data = (await response.json()) as {
        application?: Application;
        error?: string;
      };

      if (response.ok && data.application) {
        setEmail(data.application.email);
        setPhoneNumber(data.application.phoneNumber);
        setState({ status: "shortlisted", application: data.application });
        return;
      }

      clearStudentSession();
      setState({ status: "idle" });
    } catch {
      setState({ status: "idle" });
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/applications/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phoneNumber }),
      });

      const data = (await response.json()) as {
        shortlisted?: boolean;
        application?: Application;
        token?: string;
        error?: string;
      };

      if (!response.ok) {
        setState({ status: "error", message: data.error ?? "Something went wrong. Please try again." });
        return;
      }

      if (data.shortlisted && data.application && data.token) {
        saveStudentSession(data.token);
        setState({ status: "shortlisted", application: data.application });
        return;
      }

      clearStudentSession();
      setState({ status: "not-shortlisted" });
    } catch {
      setState({
        status: "error",
        message: "Could not reach the server. Check your connection and try again.",
      });
    }
  }

  function handleLogout() {
    clearStudentSession();
    setEmail("");
    setPhoneNumber("");
    setState({ status: "idle" });
  }

  function updateApplication(application: Application) {
    setState({ status: "shortlisted", application });
  }

  const isRestoring = state.status === "restoring";
  const isLoading = state.status === "loading";
  const isLoggedIn = state.status === "shortlisted";
  const showForm = !isLoggedIn && !isRestoring;

  return (
    <section className="shortlist-lookup" id="check-shortlist" aria-labelledby="shortlist-lookup-title">
      <div className="shortlist-lookup-card">
        <header className="shortlist-lookup-header compact">
          <div className="shortlist-header-row">
            <div>
              <h2 id="shortlist-lookup-title">Check shortlist &amp; accommodation</h2>
              {isLoggedIn ? (
                <p>Signed in on this device. Your details and hostel preference are below.</p>
              ) : (
                <p>
                  Enter the <strong>email and mobile</strong> from your application to view your result and enroll
                  for hostel.
                </p>
              )}
            </div>
            {isLoggedIn ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Log out
              </button>
            ) : null}
          </div>
        </header>

        {isRestoring ? (
          <p className="shortlist-restoring" role="status">
            Restoring your session…
          </p>
        ) : null}

        {showForm ? (
          <form className="shortlist-form compact-form" onSubmit={handleSubmit} noValidate>
            <div className="shortlist-form-row">
              <div className="form-field">
                <label htmlFor="lookup-email">Email</label>
                <input
                  id="lookup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>
              <div className="form-field">
                <label htmlFor="lookup-phone">Mobile</label>
                <input
                  id="lookup-phone"
                  name="phoneNumber"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="10-digit number"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="shortlist-form-actions">
              <button type="submit" className="btn btn-green btn-sm" disabled={isLoading}>
                {isLoading ? "Checking…" : "View my result"}
              </button>
            </div>
          </form>
        ) : null}

        {state.status === "error" ? (
          <div className="shortlist-alert shortlist-alert-error compact-alert" role="alert">
            <p>{state.message}</p>
          </div>
        ) : null}

        {state.status === "not-shortlisted" ? (
          <div className="shortlist-alert shortlist-alert-not-listed compact-alert" role="status">
            <h3>Not shortlisted</h3>
            <p>No application matches this email and mobile number. Verify your details or contact your polytechnic.</p>
          </div>
        ) : null}

        {isLoggedIn ? (
          <div className="shortlist-result compact-result" role="status">
            <div className="shortlist-success-banner">
              <span className="shortlist-success-icon" aria-hidden="true">
                ✓
              </span>
              <div>
                <h3>Shortlisted</h3>
                <p>Congratulations, {state.application.fullName}!</p>
              </div>
            </div>

            <dl className="shortlist-details compact-grid">
              {COMPACT_DETAILS.map(({ key, label }) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{state.application[key]}</dd>
                </div>
              ))}
              <div className="compact-grid-full">
                <dt>Address</dt>
                <dd>{state.application.address}</dd>
              </div>
            </dl>

            <AccommodationEnrollment application={state.application} onUpdated={updateApplication} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
