import Link from "next/link";
import Image from "next/image";
import { preload } from "react-dom";
import { programOverview, studentPortalPath } from "@/lib/content";

const HERO_EMBLEM_SRC = "/Jharkhand_Rajakiya_Chihna.svg";

export function HeroBanner() {
  preload(HERO_EMBLEM_SRC, { as: "image", fetchPriority: "high" });

  return (
    <section className="hero-banner" aria-labelledby="hero-title">
      <div className="container hero-inner">
        <div className="hero-copy">
          <p className="hero-eyebrow">Government of Jharkhand Initiative</p>
          <h1 id="hero-title">Industrial Training &amp; Internship at NIT Jamshedpur</h1>
          <p className="hero-lead">
            Residential skill-development programme for diploma students of Government Polytechnic colleges — notices,
            schedules, and login/profile updates published here.
          </p>
          <ul className="hero-points">
            <li>{programOverview.duration} residential training at NIT Jamshedpur</li>
            <li>On-campus hostel, mess, and modern laboratories</li>
            <li>Official certification by NIT Jamshedpur upon successful completion</li>
          </ul>
          <div className="hero-actions">
            <Link href="/student-portal" className="btn btn-yellow">
              View Results
            </Link>
            <Link href={`${studentPortalPath}#check-shortlist`} className="btn btn-outline">
              Student Login
            </Link>
          </div>
        </div>
        <div className="hero-card" aria-hidden="true">
          <Image
            src={HERO_EMBLEM_SRC}
            alt=""
            width={480}
            height={480}
            sizes="(min-width: 900px) 42vw, 88vw"
            priority
            loading="eager"
            fetchPriority="high"
            className="hero-card-image"
          />
        </div>
      </div>
    </section>
  );
}
