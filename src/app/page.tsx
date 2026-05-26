import Link from "next/link";
import { HeroBanner } from "@/components/HeroBanner";
import { NewsTicker } from "@/components/NewsTicker";
import { StatCard } from "@/components/StatCard";
import {
  certification,
  formatDate,
  notices,
  performanceTargets,
  programOverview,
  results,
} from "@/lib/content";

export default function HomePage() {
  const latestNotices = notices.slice(0, 4);

  return (
    <>
      <HeroBanner />
      <NewsTicker />

      <section className="section-light">
        <div className="container home-about">
          <div className="info-visual" aria-hidden="true">
            <div className="info-card-stack">
              <div className="info-card front">
                <p className="info-card-title">Training Completion</p>
                <p className="info-card-sub">NIT Jamshedpur</p>
              </div>
              <div className="info-card back" />
            </div>
          </div>
          <article className="info-panel">
            <h2>About the Programme</h2>
            <p>{programOverview.summary}</p>
            <p>
              <strong>Target audience:</strong> {programOverview.audience}
            </p>
            <Link href="/about" className="text-link">
              Know more →
            </Link>
          </article>
        </div>
      </section>

      <section className="dashboard-banner">
        <div className="container">
          <div className="dashboard-bar">
            <div className="dashboard-card">
              <span className="dashboard-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 14l3-3" strokeLinecap="round" />
                  <path d="M12 4a8 8 0 1 0 8 8" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
                  <path d="M4 12H2M22 12h-2M12 4V2M12 22v-2" strokeLinecap="round" opacity="0.5" />
                </svg>
              </span>
              <div className="dashboard-card-text">
                <h2>Programme Public Dashboard</h2>
                <p>&ldquo;Dedicated to diploma students of Government Polytechnics, Jharkhand&rdquo;</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container">
          <div className="stat-grid">
            {performanceTargets.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad section-muted">
        <div className="container two-col">
          <div>
            <div className="section-head">
              <h2>Latest Notices</h2>
              <Link href="/notices" className="text-link">
                View all
              </Link>
            </div>
            <ul className="notice-list compact">
              {latestNotices.map((notice) => (
                <li key={notice.id}>
                  <Link href={`/notices#${notice.id}`}>
                    <span className="notice-date">{formatDate(notice.date)}</span>
                    <span className="notice-title">{notice.title}</span>
                    {notice.isNew ? <span className="badge-new">New</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="section-head">
              <h2>Results</h2>
              <Link href="/results#check-shortlist" className="text-link">
                View my result
              </Link>
            </div>
            <ul className="notice-list compact">
              {results.map((result) => (
                <li key={result.id}>
                  <Link href="/results#check-shortlist">
                    <span className="notice-date">{formatDate(result.date)}</span>
                    <span className="notice-title">{result.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="muted-note">
              Result PDFs and merit lists will be published after each batch evaluation.
            </p>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container highlight-box">
          <h2>Certification</h2>
          <p>
            <strong>{certification.title}</strong> — issued by {certification.issuer}. {certification.details}
          </p>
        </div>
      </section>
    </>
  );
}
