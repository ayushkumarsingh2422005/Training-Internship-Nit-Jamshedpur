"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTopLoading } from "@/components/TopLoadingProvider";
import { saveTeacherSession, getTeacherSession } from "@/lib/teacher-session-client";
import { useEffect } from "react";

function TeacherLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useTopLoading(loading || checking);

  useEffect(() => {
    const token = getTeacherSession();
    if (token) {
      fetch("/api/teachers/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "", phoneNumber: "", autoAuthToken: token }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated) {
            const from = searchParams.get("from");
            router.replace(from && from.startsWith("/teacher-portal") ? from : "/teacher-portal");
          }
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [router, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teachers/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      saveTeacherSession(data.token);
      const from = searchParams.get("from");
      router.push(from && from.startsWith("/teacher-portal") ? from : "/teacher-portal");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <main className="admin-login-page">Loading…</main>;
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-card">
        <h1>Teacher sign in</h1>
        <p className="admin-login-lead">Manage examinations and view student results</p>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-field">
            <label htmlFor="teacher-email">Registered email</label>
            <input
              id="teacher-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-field">
            <label htmlFor="teacher-phone">Registered mobile number</label>
            <input
              id="teacher-phone"
              type="tel"
              autoComplete="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={loading}
            />
          </div>
          {error ? (
            <p className="admin-login-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-green" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="admin-login-back">
          <a href="/">← Back to public site</a>
        </p>
      </div>
    </main>
  );
}

export default function TeacherLoginPage() {
  return (
    <Suspense fallback={<main className="admin-login-page">Loading…</main>}>
      <TeacherLoginForm />
    </Suspense>
  );
}
