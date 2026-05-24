import type { Metadata } from "next";
import { formatDate, notices } from "@/lib/content";

export const metadata: Metadata = {
  title: "Notices",
};

export default function NoticesPage() {
  return (
    <main className="page-main">
      <div className="container">
        <header className="page-header">
          <h1>Notices &amp; Announcements</h1>
          <p className="page-lead">
            Official updates on training schedules, attendance rules, fees, and assessments. Notices are issued in
            coordination with DHTE Jharkhand and participating polytechnics.
          </p>
        </header>

        <div className="notice-board">
          {notices.map((notice) => (
            <article key={notice.id} id={notice.id} className="notice-card">
              <div className="notice-card-head">
                <span className={`category-tag cat-${notice.category.toLowerCase()}`}>{notice.category}</span>
                <time dateTime={notice.date}>{formatDate(notice.date)}</time>
                {notice.isNew ? <span className="badge-new">New</span> : null}
              </div>
              <h2>{notice.title}</h2>
              <p className="notice-excerpt">{notice.excerpt}</p>
              <div className="notice-body">{notice.body}</div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
