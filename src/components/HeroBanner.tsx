import Link from "next/link";
import { programOverview } from "@/lib/content";

export function HeroBanner() {
  return (
    <section className="hero-banner" aria-labelledby="hero-title">
      <div className="container hero-inner">
        <div className="hero-copy">
          <p className="hero-eyebrow">Government of Jharkhand Initiative</p>
          <h1 id="hero-title">Industrial Training &amp; Internship at NIT Jamshedpur</h1>
          <p className="hero-lead">
            Residential skill-development programme for diploma students of Government Polytechnic colleges — notices,
            schedules, and results published here.
          </p>
          <ul className="hero-points">
            <li>{programOverview.capacity} · {programOverview.duration} residential training</li>
            <li>On-campus hostel, mess, and modern laboratories</li>
            <li>Official certification by NIT Jamshedpur upon successful completion</li>
          </ul>
          <div className="hero-actions">
            <Link href="/notices" className="btn btn-yellow">
              View Notices
            </Link>
            <Link href="/results" className="btn btn-outline">
              Check Results
            </Link>
          </div>
        </div>
        <div className="hero-card" aria-hidden="true">
          <div className="hero-card-top">Training Pass</div>
          <div className="hero-card-body">
            <p className="hero-card-org">NIT Jamshedpur</p>
            <p className="hero-card-scheme">DHTE Skill Programme</p>
            <div className="hero-card-chip" />
            <p className="hero-card-name">Diploma Trainee</p>
            <p className="hero-card-meta">6-Week Residential Batch</p>
          </div>
        </div>
      </div>
    </section>
  );
}
