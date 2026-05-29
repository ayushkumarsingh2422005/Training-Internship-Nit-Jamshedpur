"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminApplication } from "@/lib/admin-application";
import type { NoticeCategory } from "@/lib/notices";
import { useTopLoading } from "@/components/TopLoadingProvider";

type AppliedFilters = {
  q: string;
  college: string;
  subject: string;
  subpart: string;
  accommodation: string;
  laptop: string;
  gender: string;
};

type ApiResponse = {
  total: number;
  page: number;
  limit: number;
  items: AdminApplication[];
  filters: { subjects: string[]; subparts: string[] };
  stats: {
    hostelYes: number;
    hostelNo: number;
    hostelUnset: number;
    laptopYes: number;
    laptopNo: number;
    laptopUnset: number;
  };
};

type AdminNotice = {
  id: string;
  title: string;
  date: string;
  category: NoticeCategory;
  excerpt: string;
  body: string;
  isNew: boolean;
  isPublished: boolean;
};

type NoticeForm = {
  id: string | null;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  body: string;
  isNew: boolean;
  isPublished: boolean;
};

const LIMIT = 50;
const NOTICE_CATEGORY_OPTIONS = [
  "General",
  "Schedule",
  "Admission",
  "Assessment",
  "Hostel",
  "Fees",
  "Documents",
  "Workshop",
  "Examination",
  "Placement",
] as const;
const DEFAULT_NOTICE_FORM: NoticeForm = {
  id: null,
  title: "",
  date: new Date().toISOString().slice(0, 10),
  category: "General",
  excerpt: "",
  body: "",
  isNew: true,
  isPublished: true,
};

function hostelLabel(app: AdminApplication): string {
  if (app.wantsAccommodation === true) {
    return app.gender ? `Yes (${app.gender})` : "Yes";
  }
  if (app.wantsAccommodation === false) return "No";
  return "—";
}

function laptopLabel(app: AdminApplication): string {
  if (app.hasLaptop === true) return "Yes";
  if (app.hasLaptop === false) return "No";
  return "—";
}

export function AdminDashboard() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [college, setCollege] = useState("");
  const [subject, setSubject] = useState("");
  const [subpart, setSubpart] = useState("");
  const [accommodation, setAccommodation] = useState("");
  const [laptop, setLaptop] = useState("");
  const [gender, setGender] = useState("");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState<AppliedFilters>({
    q: "",
    college: "",
    subject: "",
    subpart: "",
    accommodation: "",
    laptop: "",
    gender: "",
  });
  const [csvExporting, setCsvExporting] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingApplicationId, setDeletingApplicationId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotices, setAdminNotices] = useState<AdminNotice[]>([]);
  const [noticeLoading, setNoticeLoading] = useState(true);
  const [noticeError, setNoticeError] = useState<string | null>(null);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeForm, setNoticeForm] = useState<NoticeForm>(DEFAULT_NOTICE_FORM);
  const [selectedCategoryOption, setSelectedCategoryOption] = useState<string>(DEFAULT_NOTICE_FORM.category);
  const [customCategory, setCustomCategory] = useState("");
  const [activeSection, setActiveSection] = useState<"applications" | "notices">("applications");

  useTopLoading(
    loading || noticeLoading || noticeSaving || deletingApplicationId !== null || csvExporting,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (applied.q) params.set("q", applied.q);
    if (applied.college) params.set("college", applied.college);
    if (applied.subject) params.set("subject", applied.subject);
    if (applied.subpart) params.set("subpart", applied.subpart);
    if (applied.accommodation) params.set("accommodation", applied.accommodation);
    if (applied.laptop) params.set("laptop", applied.laptop);
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

  const loadNotices = useCallback(async () => {
    setNoticeLoading(true);
    setNoticeError(null);
    try {
      const response = await fetch("/api/admin/notices");
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const json = (await response.json()) as { items?: AdminNotice[]; error?: string };
      if (!response.ok) {
        setNoticeError(json.error ?? "Failed to load notices.");
        return;
      }
      setAdminNotices(json.items ?? []);
    } catch {
      setNoticeError("Network error while loading notices.");
    } finally {
      setNoticeLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadNotices();
  }, [loadNotices]);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setApplied({ q, college, subject, subpart, accommodation, laptop, gender });
  }

  function clearFilters() {
    setQ("");
    setCollege("");
    setSubject("");
    setSubpart("");
    setAccommodation("");
    setLaptop("");
    setGender("");
    setPage(1);
    setApplied({
      q: "",
      college: "",
      subject: "",
      subpart: "",
      accommodation: "",
      laptop: "",
      gender: "",
    });
  }

  async function downloadCsv() {
    setCsvExporting(true);
    setError(null);

    const params = new URLSearchParams();
    if (applied.q) params.set("q", applied.q);
    if (applied.college) params.set("college", applied.college);
    if (applied.subject) params.set("subject", applied.subject);
    if (applied.subpart) params.set("subpart", applied.subpart);
    if (applied.accommodation) params.set("accommodation", applied.accommodation);
    if (applied.laptop) params.set("laptop", applied.laptop);
    if (applied.gender) params.set("gender", applied.gender);
    params.set("export", "csv");

    try {
      const response = await fetch(`/api/admin/applications?${params.toString()}`);
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!response.ok) {
        let message = "Failed to export CSV.";
        try {
          const json = (await response.json()) as { error?: string };
          message = json.error ?? message;
        } catch {
          // non-JSON error body
        }
        setError(message);
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `students-${new Date().toISOString().slice(0, 10)}.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Network error while exporting CSV.");
    } finally {
      setCsvExporting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  async function deleteApplication(app: AdminApplication) {
    const confirmed = window.confirm(`Delete student record for ${app.fullName}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingApplicationId(app.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/applications?id=${encodeURIComponent(app.id)}`, { method: "DELETE" });
      const json = (await response.json()) as { error?: string };
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!response.ok) {
        setError(json.error ?? "Failed to delete application.");
        return;
      }
      if (expandedId === app.id) {
        setExpandedId(null);
      }
      await load();
    } catch {
      setError("Network error while deleting application.");
    } finally {
      setDeletingApplicationId(null);
    }
  }

  async function saveNotice(event: React.FormEvent) {
    event.preventDefault();
    setNoticeSaving(true);
    setNoticeError(null);
    try {
      const payload = {
        id: noticeForm.id,
        title: noticeForm.title,
        date: noticeForm.date,
        category:
          selectedCategoryOption === "__custom__" ? customCategory.trim() : selectedCategoryOption.trim(),
        excerpt: noticeForm.excerpt,
        body: noticeForm.body,
        isNew: noticeForm.isNew,
        isPublished: noticeForm.isPublished,
      };
      const response = await fetch("/api/admin/notices", {
        method: noticeForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setNoticeError(json.error ?? "Failed to save notice.");
        return;
      }
      setNoticeForm(DEFAULT_NOTICE_FORM);
      setSelectedCategoryOption(DEFAULT_NOTICE_FORM.category);
      setCustomCategory("");
      await loadNotices();
    } catch {
      setNoticeError("Network error while saving notice.");
    } finally {
      setNoticeSaving(false);
    }
  }

  function editNotice(notice: AdminNotice) {
    setNoticeForm({
      id: notice.id,
      title: notice.title,
      date: notice.date,
      category: notice.category,
      excerpt: notice.excerpt,
      body: notice.body,
      isNew: notice.isNew,
      isPublished: notice.isPublished,
    });
    if ((NOTICE_CATEGORY_OPTIONS as readonly string[]).includes(notice.category)) {
      setSelectedCategoryOption(notice.category);
      setCustomCategory("");
    } else {
      setSelectedCategoryOption("__custom__");
      setCustomCategory(notice.category);
    }
    setActiveSection("notices");
  }

  async function deleteNotice(id: string) {
    if (!window.confirm("Delete this notice?")) return;
    setNoticeError(null);
    try {
      const response = await fetch(`/api/admin/notices?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setNoticeError(json.error ?? "Failed to delete notice.");
        return;
      }
      if (noticeForm.id === id) {
        setNoticeForm(DEFAULT_NOTICE_FORM);
        setSelectedCategoryOption(DEFAULT_NOTICE_FORM.category);
        setCustomCategory("");
      }
      await loadNotices();
    } catch {
      setNoticeError("Network error while deleting notice.");
    }
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

      <div className="admin-section-switcher">
        <button
          type="button"
          className={`btn btn-sm ${activeSection === "applications" ? "btn-green" : "btn-secondary"}`}
          onClick={() => setActiveSection("applications")}
        >
          Applications
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeSection === "notices" ? "btn-green" : "btn-secondary"}`}
          onClick={() => setActiveSection("notices")}
        >
          Notices
        </button>
      </div>

      {activeSection === "applications" && data ? (
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
          <div className="admin-stat-card">
            <span className="admin-stat-value">{data.stats.laptopYes}</span>
            <span className="admin-stat-label">Laptop: Yes</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{data.stats.laptopNo}</span>
            <span className="admin-stat-label">Laptop: No</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{data.stats.laptopUnset}</span>
            <span className="admin-stat-label">Laptop: Not set</span>
          </div>
        </div>
      ) : null}

      {activeSection === "applications" ? <form className="admin-filters" onSubmit={handleSearch}>
        <div className="admin-filters-row">
          <div className="form-field admin-filter-search">
            <label htmlFor="admin-q">Search</label>
            <input
              id="admin-q"
              type="search"
              placeholder="Name, email, phone, school…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="form-field admin-filter-search">
            <label htmlFor="admin-college">College</label>
            <input
              id="admin-college"
              type="search"
              placeholder="College name only"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
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
          <div className="form-field">
            <label htmlFor="admin-laptop">Laptop</label>
            <select id="admin-laptop" value={laptop} onChange={(e) => setLaptop(e.target.value)}>
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="unset">Not set</option>
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
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={csvExporting || loading || !data?.total}
            onClick={() => void downloadCsv()}
          >
            {csvExporting ? "Preparing CSV…" : `Download CSV (${data?.total ?? 0})`}
          </button>
        </div>
      </form> : null}

      {activeSection === "applications" && error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      {activeSection === "applications" && loading ? <p className="admin-loading">Loading…</p> : null}

      {activeSection === "applications" && !loading && data && data.items.length === 0 ? (
        <p className="admin-empty">No applications match your filters.</p>
      ) : null}

      {activeSection === "applications" && !loading && data && data.items.length > 0 ? (
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
                  <th>Laptop</th>
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
                      <td>{laptopLabel(app)}</td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                          >
                            {expandedId === app.id ? "Hide" : "More"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-admin btn-sm"
                            onClick={() => void deleteApplication(app)}
                            disabled={deletingApplicationId === app.id}
                          >
                            {deletingApplicationId === app.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === app.id ? (
                      <tr className="admin-detail-row">
                        <td colSpan={9}>
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

      {activeSection === "notices" ? (
        <section className="admin-notices-layout">
          <form className="admin-filters admin-notice-form" onSubmit={saveNotice}>
            <h2>{noticeForm.id ? "Edit notice" : "Create notice"}</h2>
            <div className="form-field">
              <label htmlFor="notice-title">Title</label>
              <input
                id="notice-title"
                value={noticeForm.title}
                onChange={(e) => setNoticeForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div className="admin-filters-row">
              <div className="form-field">
                <label htmlFor="notice-date">Date</label>
                <input
                  id="notice-date"
                  type="date"
                  value={noticeForm.date}
                  onChange={(e) => setNoticeForm((prev) => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="notice-category">Category</label>
                <select
                  id="notice-category"
                  value={selectedCategoryOption}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedCategoryOption(value);
                    if (value !== "__custom__") {
                      setNoticeForm((prev) => ({ ...prev, category: value }));
                    } else {
                      setNoticeForm((prev) => ({ ...prev, category: customCategory.trim() }));
                    }
                  }}
                >
                  {NOTICE_CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value="__custom__">Custom category</option>
                </select>
              </div>
            </div>
            {selectedCategoryOption === "__custom__" ? (
              <div className="form-field">
                <label htmlFor="notice-custom-category">Custom category</label>
                <input
                  id="notice-custom-category"
                  value={customCategory}
                  maxLength={60}
                  placeholder="Enter your category"
                  onChange={(e) => {
                    setCustomCategory(e.target.value);
                    setNoticeForm((prev) => ({ ...prev, category: e.target.value }));
                  }}
                  required
                />
              </div>
            ) : null}
            <div className="form-field">
              <label htmlFor="notice-excerpt">Excerpt</label>
              <textarea
                id="notice-excerpt"
                value={noticeForm.excerpt}
                onChange={(e) => setNoticeForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                rows={3}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="notice-body">Body</label>
              <textarea
                id="notice-body"
                value={noticeForm.body}
                onChange={(e) => setNoticeForm((prev) => ({ ...prev, body: e.target.value }))}
                rows={6}
                required
              />
            </div>
            <div className="admin-notice-checks">
              <label>
                <input
                  type="checkbox"
                  checked={noticeForm.isNew}
                  onChange={(e) => setNoticeForm((prev) => ({ ...prev, isNew: e.target.checked }))}
                />{" "}
                Mark as new
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={noticeForm.isPublished}
                  onChange={(e) => setNoticeForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                />{" "}
                Published on public site
              </label>
            </div>
            <div className="admin-filters-actions">
              <button type="submit" className="btn btn-green btn-sm" disabled={noticeSaving}>
                {noticeSaving ? "Saving..." : noticeForm.id ? "Update notice" : "Create notice"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setNoticeForm(DEFAULT_NOTICE_FORM);
                  setSelectedCategoryOption(DEFAULT_NOTICE_FORM.category);
                  setCustomCategory("");
                }}
                disabled={noticeSaving}
              >
                Reset
              </button>
            </div>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Notice</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {noticeLoading ? (
                  <tr>
                    <td colSpan={5}>Loading notices...</td>
                  </tr>
                ) : adminNotices.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No notices found in database.</td>
                  </tr>
                ) : (
                  adminNotices.map((notice) => (
                    <tr key={notice.id}>
                      <td>
                        <strong>{notice.title}</strong>
                        <br />
                        <span className="admin-muted">{notice.excerpt}</span>
                      </td>
                      <td>{new Date(notice.date).toLocaleDateString("en-IN")}</td>
                      <td>{notice.category}</td>
                      <td>
                        {notice.isPublished ? "Published" : "Draft"}
                        {notice.isNew ? " • New" : ""}
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => editNotice(notice)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-admin btn-sm"
                            onClick={() => void deleteNotice(notice.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {noticeError ? (
              <p className="admin-error" role="alert">
                {noticeError}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
