import Link from "next/link";
import type { PublicNotice } from "@/lib/notices";

type NewsTickerProps = {
  notices: PublicNotice[];
};

export function NewsTicker({ notices }: NewsTickerProps) {
  const items = notices.filter((n) => n.isNew).length > 0 ? notices.filter((n) => n.isNew) : notices.slice(0, 3);
  const tickerText =
    items.length > 0
      ? items.map((n) => n.excerpt).join("   •   ")
      : "Latest programme notices will be published here shortly.";
  const scrollText = `${tickerText}   •   ${tickerText}`;

  return (
    <section className="news-ticker" aria-label="Latest announcements">
      <div className="ticker-label">
        <span className="ticker-icon" aria-hidden="true">
          📢
        </span>
        <span className="ticker-label-text">What&apos;s New</span>
      </div>
      <div className="ticker-track">
        <div className="ticker-scroll" aria-live="polite">
          <p className="ticker-content">
            <Link href="/notices">{scrollText}</Link>
          </p>
          <p className="ticker-content" aria-hidden="true">
            <Link href="/notices" tabIndex={-1}>
              {scrollText}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
