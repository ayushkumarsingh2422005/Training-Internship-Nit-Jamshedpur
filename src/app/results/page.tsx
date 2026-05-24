import type { Metadata } from "next";
import { formatDate, results } from "@/lib/content";

export const metadata: Metadata = {
  title: "Results",
};

export default function ResultsPage() {
  return (
    <main className="page-main">
      <div className="container">
        <header className="page-header">
          <h1>Result Announcements</h1>
          <p className="page-lead">
            Published outcomes of internal assessments and final evaluations for each training batch. Download links
            will appear here when results are officially released.
          </p>
        </header>

        {results.length === 0 ? (
          <div className="empty-state">
            <p>No results have been published yet. Please check back after batch evaluations are complete.</p>
          </div>
        ) : (
          <div className="result-grid">
            {results.map((result) => (
              <article key={result.id} className="result-card">
                <time dateTime={result.date}>{formatDate(result.date)}</time>
                <h2>{result.title}</h2>
                <p className="result-batch">{result.batch}</p>
                <p>{result.description}</p>
                {result.fileUrl ? (
                  <a href={result.fileUrl} className="btn btn-green" download>
                    {result.fileLabel ?? "Download PDF"}
                  </a>
                ) : (
                  <span className="result-pending">{result.fileLabel ?? "Pending publication"}</span>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
