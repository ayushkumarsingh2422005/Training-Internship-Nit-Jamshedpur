import type { Metadata } from "next";
import { ShortlistLookup } from "@/components/ShortlistLookup";

export const metadata: Metadata = {
  title: "Login & Profile",
};

export default function StudentPortalPage() {
  return (
    <main className="page-main">
      <div className="container">
        <header className="page-header">
          <h1>Login &amp; Profile</h1>
          <p className="page-lead">
            Log in with your registered email and mobile number to check shortlist status and view your profile details
            for industrial training at NIT Jamshedpur.
          </p>
        </header>

        <ShortlistLookup />
      </div>
    </main>
  );
}
