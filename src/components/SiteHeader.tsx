import Image from "next/image";
import Link from "next/link";
import { FontSizeControls } from "./FontSizeControls";
import { SiteNav } from "./SiteNav";
import { site } from "@/lib/content";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="utility-bar">
        <div className="container utility-inner">
          <div className="utility-campaigns" aria-hidden="true">
            Backed By <b>NIT Jamshedpur</b>
            <Image src="/nitjsrlogo.png" alt="NIT Jamshedpur" width={20} height={20} />
          </div>
          <div className="utility-access">
            <FontSizeControls />
            <span className="utility-skip">
              <span className="utility-divider" aria-hidden="true" />
              <a href="#main-content">Skip to main content</a>
              <span className="utility-divider" aria-hidden="true" />
              <a href="#main-content">Screen reader access</a>
            </span>
          </div>
        </div>
      </div>

      <div className="header-main">
        <div className="brand-bar">
          <div className="container brand-inner">
            <div className="brand-emblem-spacer" aria-hidden="true" />

            <div className="brand-text">
              <p className="brand-dept">Department of Higher and Technical Education</p>
              <p className="brand-govt">Government of Jharkhand</p>
            </div>

            <div className="brand-actions brand-actions-desktop">
              <div className="toll-widget">
                <span className="toll-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.55.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.55 1 1 0 01-.24 1.01l-2.2 2.22z" />
                  </svg>
                </span>
                <div className="toll-copy">
                  <span className="toll-label">Helpline</span>
                  <a href={`tel:+91${site.phone}`} className="toll-number">
                    {site.phone}
                  </a>
                </div>
              </div>
              <Link href="/notices" className="btn-pill btn-pill-blue">
                Notices
              </Link>
              <Link href="/results" className="btn-pill btn-pill-green">
                Results
              </Link>
            </div>
          </div>
        </div>

        <div className="container emblem-float-wrap">
          <Link href="/" className="brand-emblem-overlap" aria-label="Home — Government of Jharkhand">
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
