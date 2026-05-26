"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminApplication } from "@/lib/admin-application";

type AppliedFilters = {
  q: string;
  subject: string;
  subpart: string;
  accommodation: string;
  gender: string;
};

type ApiResponse = {
  total: number;
  page: number;
  limit: number;
  items: AdminApplication[];
  filters: { subjects: string[]; subparts: string[] };
  stats: { hostelYes: number; hostelNo: number; hostelUnset: number };
};

const LIMIT = 50;

function hostelLabel(app: AdminApplication): string {
  if (app.wantsAccommodation === true) {
    return app.gender ? `Yes (${app.gender})` : "Yes";
  }
  if (app.wantsAccommodation === false) return "No";
  return "—";
}

export function AdminDashboard() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [subpart, setSubpart] = useState("");
  const [accommodation, setAccommodation] = useState("");
  const [gender, setGender] = useState("");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState<AppliedFilters>({
    q: "",
    subject: "",
    subpart: "",
    accommodation: "",
    gender: "",
  });
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (applied.q) params.set("q", applied.q);
    if (applied.subject) params.set("subject", applied.subject);
    if (applied.subpart) params.set("subpart", applied.subpart);
    if (applied.accommodation) params.set("accommodation", applied.accommodation);
    if (applied.gender) params.set("gender", applied.gender);
    params.set("page", String(page));
    params.set("limit", String(LIMIT));

    try {
      const response = await fetch(`/api/admin/applications?${params.toString()}`);
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const json = (await response.json()) as ApiResponse & { error?: string };
      if (!response.ok) {
        setError(json.error ?? "Failed to load data.");
        return;
      }
      setData(json);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [applied, page, router]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setApplied({ q, subject, subpart, accommodation, gender });
  }

  function clearFilters() {
    setQ("");
    setSubject("");
    setSubpart("");
    setAccommodation("");
    setGender("");
    setPage(1);
    setApplied({ q: "", subject: "", subpart: "", accommodation: "", gender: "" });
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="admin-dashboard">
      <header className="admin-topbar">
        <div>
          <h1>Applications dashboard</h1>
          <p>All shortlisted students — search, filter, and review records.</p>
        </div>
        <div className="admin-topbar-actions">
          <a href="/" className="btn btn-secondary btn-sm">
            Public site
          </a>
          <button type="button" className="btn btn-outline-admin btn-sm" onClick={() => void load()}>
            Refresh
          </button>
          <button type="button" className="btn btn-green btn-sm" onClick={() => void handleLogout()}>
            Log out
          </button>
        </div>
      </header>

      {data ? (
        <div className="admin-stats">
          <div className="admin-stat-card">
            <span className="admin-stat-value">{data.total}</span>
            <span className="admin-stat-label">Matching records</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{data.stats.hostelYes}</span>
            <span className="admin-stat-label">Hostel: Yes</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{data.stats.hostelNo}</span>
            <span className="admin-stat-label">Hostel: No</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{data.stats.hostelUnset}</span>
            <span className="admin-stat-label">Hostel: Not set</span>
          </div>
        </div>
      ) : null}

      <form className="admin-filters" onSubmit={handleSearch}>
        <div className="admin-filters-row">
          <div className="form-field admin-filter-search">
            <label htmlFor="admin-q">Search</label>
            <input
              id="admin-q"
              type="search"
              placeholder="Name, email, phone, college…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="admin-subject">Branch</label>
            <select id="admin-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">All</option>
              {data?.filters.subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="admin-subpart">Module</label>
            <select id="admin-subpart" value={subpart} onChange={(e) => setSubpart(e.target.value)}>
              <option value="">All</option>
              {data?.filters.subparts.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="admin-acc">Hostel</label>
            <select
              id="admin-acc"
              value={accommodation}
              onChange={(e) => setAccommodation(e.target.value)}
            >
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="unset">Not set</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="admin-gender">Gender</label>
            <select id="admin-gender" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className="admin-filters-actions">
          <button type="submit" className="btn btn-green btn-sm">
            Apply filters
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </form>

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <p className="admin-loading">Loading…</p> : null}

      {!loading && data && data.items.length === 0 ? (
        <p className="admin-empty">No applications match your filters.</p>
      ) : null}

      {!loading && data && data.items.length > 0 ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>College</th>
                  <th>Branch</th>
                  <th>Module</th>
                  <th>Hostel</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((app) => (
                  <Fragment key={app.id}>
                    <tr>
                      <td>{app.fullName}</td>
                      <td>
                        <a href={`mailto:${app.email}`}>{app.email}</a>
                      </td>
                      <td>{app.phoneNumber}</td>
                      <td>{app.collegeName}</td>
                      <td>{app.subject}</td>
                      <td>{app.subpart}</td>
                      <td>{hostelLabel(app)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                        >
                          {expandedId === app.id ? "Hide" : "More"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === app.id ? (
                      <tr className="admin-detail-row">
                        <td colSpan={8}>
                          <dl className="admin-detail-grid">
                            <div>
                              <dt>Father / guardian</dt>
                              <dd>{app.fatherName}</dd>
                            </div>
                            <div>
                              <dt>School</dt>
                              <dd>{app.schoolName}</dd>
                            </div>
                            <div className="admin-detail-full">
                              <dt>Address</dt>
                              <dd>{app.address}</dd>
                            </div>
                            {app.accommodationEnrolledAt ? (
                              <div>
                                <dt>Hostel saved at</dt>
                                <dd>{new Date(app.accommodationEnrolledAt).toLocaleString("en-IN")}</dd>
                              </div>
                            ) : null}
                          </dl>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-pagination">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages} ({data.total} total)
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
