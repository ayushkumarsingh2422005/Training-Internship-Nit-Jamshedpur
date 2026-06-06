"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useTopLoading } from "@/components/TopLoadingProvider";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useTopLoading(loading);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }

      const from = searchParams.get("from");
      router.push(from && from.startsWith("/admin") ? from : "/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-card">
        <h1>Admin sign in</h1>
        <p className="admin-login-lead">Admin / Hostel Admin dashboard access</p>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-field">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main className="admin-login-page">Loading…</main>}>
      <AdminLoginForm />
    </Suspense>
  );
}
