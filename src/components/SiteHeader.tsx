import Image from "next/image";
import Link from "next/link";
import { DeveloperCredit } from "./DeveloperCredit";
import { FontSizeControls } from "./FontSizeControls";
import { SiteNav } from "./SiteNav";
import { site, siteLinks, studentPortalPath } from "@/lib/content";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="utility-bar">
        <div className="container utility-inner">
          <a
            href={siteLinks.nitOfficial}
            target="_blank"
            rel="noopener noreferrer"
            className="utility-nit-link"
          >
            NIT Jamshedpur Portal
          </a>

          <div className="utility-access">
            <DeveloperCredit className="utility-developer-credit" logoSize={20} />
            <span className="utility-divider" aria-hidden="true" />
            <FontSizeControls />
          </div>
        </div>
      </div>

      <div className="header-main">
        <div className="brand-bar">
          <div className="container brand-inner">
            <div className="brand-emblem-spacer" aria-hidden="true" />

            <div className="brand-text">
              <p className="brand-dept">NIT Jamshedpur Internship</p>
              <p className="brand-govt">Backed by Gov of Jharkhand</p>
            </div>

            <div className="brand-actions brand-actions-desktop">
              <div className="toll-widget">
                <span className="toll-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                </span>
                <div className="toll-copy">
                  <span className="toll-label">Contact</span>
                  <a href={`mailto:${site.nitContact}`} className="toll-number toll-email">
                    {site.nitContact}
                  </a>
                </div>
              </div>
              <Link href="/student-portal" className="btn-pill btn-pill-blue">
                Results
              </Link>
              <Link href={`${studentPortalPath}#check-shortlist`} className="btn-pill btn-pill-green">
                Student Login
              </Link>
            </div>
          </div>
        </div>

        <div className="container emblem-float-wrap">
          <Link href="/" className="brand-emblem-overlap" aria-label="Home — NIT Jamshedpur Internship Portal">
            <span className="emblem-ring">
              <Image
                src="/nitjsrlogo.png"
                alt=""
                width={126}
                height={126}
                className="emblem-image"
                priority
              />
            </span>
          </Link>
        </div>

        <SiteNav />
      </div>
    </header>
  );
}
