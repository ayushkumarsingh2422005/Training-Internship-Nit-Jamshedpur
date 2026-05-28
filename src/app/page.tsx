import Image from "next/image";
import Link from "next/link";
import { HeroBanner } from "@/components/HeroBanner";
import { NewsTicker } from "@/components/NewsTicker";
import { StatCard } from "@/components/StatCard";
import { getPublishedNotices } from "@/lib/notices";
import {
  certification,
  formatDate,
  notices as fallbackNotices,
  performanceTargets,
  programOverview,
  results,
} from "@/lib/content";

export default async function HomePage() {
  const notices = await getPublishedNotices().catch(() =>
    fallbackNotices.map((item) => ({
      id: item.id,
      title: item.title,
      date: item.date,
      category: item.category,
      excerpt: item.excerpt,
      body: item.body,
      isNew: Boolean(item.isNew),
    })),
  );
  const latestNotices = notices.slice(0, 4);

  return (
    <>
      <HeroBanner />
      <NewsTicker notices={notices} />

      <section className="section-light">
        <div className="container home-about">
          <div className="info-visual">
            <Image
              src="/tech.png"
              alt="Students in industrial training and skill development at NIT Jamshedpur"
              width={1200}
              height={900}
              className="home-about-image"
              sizes="(min-width: 800px) 50vw, 100vw"
            />
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
              <h2>Login &amp; Profile</h2>
              <Link href="/results#check-shortlist" className="text-link">
                Open section
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
              Log in with registered details to check your shortlist status and profile details.
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
