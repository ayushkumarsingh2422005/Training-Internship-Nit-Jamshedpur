import type { Metadata } from "next";
import { ShortlistLookup } from "@/components/ShortlistLookup";
import { formatDate, results } from "@/lib/content";

export const metadata: Metadata = {
  title: "Results",
};

export default function ResultsPage() {
  return (
    <main className="page-main">
      <div className="container">
        <header className="page-header">
          <h1>Results &amp; Shortlist</h1>
          <p className="page-lead">
            Check whether your application has been shortlisted for industrial training at NIT Jamshedpur. Use the
            email and mobile number from your original application.
          </p>
        </header>

        <ShortlistLookup />
      </div>
    </main>
  );
}
