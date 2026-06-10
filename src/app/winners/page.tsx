import type { Metadata } from "next";
import Image from "next/image";
import { winnerPosters } from "@/lib/content";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Winners",
  description: "Winner posters and highlights from internship programme quiz events.",
  path: "/winners",
});

export default function WinnersPage() {
  return (
    <section className="section-pad" aria-label="Winners">
      <div className="container">
        <div className="section-head">
          <h1>Winners</h1>
          <span className="muted-note">Latest quiz winner posters</span>
        </div>
        <div className="winners-grid">
          {winnerPosters.map((poster) => (
            <article key={poster.id} className="winner-card">
              <div className="winner-card-head">
                <h2>{poster.title}</h2>
              </div>
              <a href={poster.imageUrl} target="_blank" rel="noopener noreferrer" className="winner-poster-link">
                <Image
                  src={poster.imageUrl}
                  alt={poster.title}
                  width={1200}
                  height={675}
                  className="winner-poster"
                  sizes="(min-width: 1000px) 48vw, 100vw"
                />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
