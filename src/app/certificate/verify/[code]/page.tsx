import type { Metadata } from "next";
import Link from "next/link";
import connectDB from "@/lib/mongodb";
import Certificate from "@/models/Certificate";
import ManualExamResult from "@/models/ManualExamResult";
import TestResult from "@/models/TestResult";

export const metadata: Metadata = {
  title: "Verify Certificate",
  description: "Verify an internship completion certificate issued by NIT Jamshedpur.",
  robots: { index: false, follow: false },
};

function formatDate(value: Date): string {
  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let certificate = null;
  let hasExamResult = false;

  if (/^[a-f0-9]{48}$/i.test(code)) {
    await connectDB();
    certificate = await Certificate.findOne({ verificationCode: code }).lean();
    if (certificate) {
      const [cbtResult, manualResult] = await Promise.all([
        TestResult.exists({ studentId: certificate.applicationId }),
        ManualExamResult.exists({ studentId: certificate.applicationId }),
      ]);
      hasExamResult = Boolean(cbtResult || manualResult);
    }
  }

  const valid = certificate?.status === "valid" && hasExamResult;

  return (
    <main className="page-main certificate-verification-page">
      <div className="container">
        <section className="certificate-verification-card">
          <div
            className={`certificate-verification-status ${
              valid ? "certificate-verification-status--valid" : "certificate-verification-status--invalid"
            }`}
          >
            <span aria-hidden="true">{valid ? "✓" : "!"}</span>
            <div>
              <h1>{valid ? "Certificate verified" : "Certificate not valid"}</h1>
              <p>
                {valid
                  ? "This certificate was issued by NIT Jamshedpur."
                  : "This verification code is invalid or the certificate has been revoked."}
              </p>
            </div>
          </div>

          {certificate ? (
            <dl className="certificate-verification-details">
              <div>
                <dt>Student name</dt>
                <dd>{certificate.fullName}</dd>
              </div>
              <div>
                <dt>Intern ID / Certificate number</dt>
                <dd>{certificate.certificateNumber}</dd>
              </div>
              <div>
                <dt>College</dt>
                <dd>{certificate.collegeName}</dd>
              </div>
              <div>
                <dt>Branch</dt>
                <dd>{certificate.subject}</dd>
              </div>
              <div>
                <dt>Training module</dt>
                <dd>{certificate.subpart}</dd>
              </div>
              <div>
                <dt>Programme</dt>
                <dd>6-week residential internship programme</dd>
              </div>
              <div>
                <dt>Issue date</dt>
                <dd>{formatDate(certificate.issuedAt)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{valid ? "Valid" : "Revoked"}</dd>
              </div>
            </dl>
          ) : null}

          <p className="certificate-verification-privacy">
            Personal contact details and government identifiers are intentionally not displayed.
          </p>
          <Link href="/" className="btn btn-green btn-sm">
            Go to portal
          </Link>
        </section>
      </div>
    </main>
  );
}
