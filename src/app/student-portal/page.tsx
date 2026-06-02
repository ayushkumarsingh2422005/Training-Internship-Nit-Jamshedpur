import type { Metadata } from "next";
import { ShortlistLookup } from "@/components/ShortlistLookup";
import { studentPortalPath } from "@/lib/content";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Login & Profile",
  description:
    "Student login for NIT Jamshedpur internship shortlist — check status, view profile info, attendance, and certificate section with registered email and mobile number.",
  path: studentPortalPath,
  keywords: [
    "NIT Jamshedpur shortlist",
    "internship login NIT JSR",
    "student profile NIT Jamshedpur",
    "polytechnic internship login Jharkhand",
  ],
});

export default function StudentPortalPage() {
  return (
    <main className="page-main">
      <div className="container">
        <header className="page-header">
          <h1>Login &amp; Profile</h1>
          <p className="page-lead">
            Log in with your registered email and mobile number to check shortlist status, view profile information,
            attendance, and certificate section.
          </p>
        </header>

        <ShortlistLookup />
      </div>
    </main>
  );
}
