import Image from "next/image";
import Link from "next/link";
import { FontSizeControls } from "./FontSizeControls";
import { SiteNav } from "./SiteNav";
import { site, studentPortalPath } from "@/lib/content";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="utility-bar">
        <div className="container utility-inner">
          <div className="utility-campaigns" aria-hidden="true">
            Developed By <b> <a href="https://digicraft.one" target="_blank">DigiCraft</a></b>
            <img src="https://data.digicraft.one/Logo/Main.png" alt="NIT Jamshedpur" width={20} height={20} />
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
              <Link href="/notices" className="btn-pill btn-pill-blue">
                Notices
              </Link>
              <Link href={`${studentPortalPath}#check-shortlist`} className="btn-pill btn-pill-green">
                Login & Profile
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
