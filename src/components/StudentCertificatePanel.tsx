"use client";

import { useEffect, useRef, useState } from "react";
import { CertificateSheet } from "@/components/CertificateSheet";
import { formatCertificateDate } from "@/lib/certificate-meta";
import { signatureDataUrl } from "@/lib/id-card-assets";
import { authHeaders } from "@/lib/student-session-client";
import { downloadStudentCertificatePdf } from "@/lib/student-certificate-pdf";
import type { Application } from "@/types/application";

type StudentCertificatePanelProps = {
  application: Application;
  onRequestFeedback: () => void;
};

type CertificateInfo = {
  certificateNumber: string;
  issuedAt: string;
  verificationUrl: string;
  status: "valid";
};

type CertificateResponse =
  | { eligible: true; certificate: CertificateInfo }
  | {
      eligible: false;
      requirement: "intern-id" | "course-feedback" | "exam-result" | "certificate-valid";
      reason: string;
    };

export function StudentCertificatePanel({
  application,
  onRequestFeedback,
}: StudentCertificatePanelProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [certificate, setCertificate] = useState<CertificateInfo | null>(null);
  const [requirement, setRequirement] = useState<
    "" | "intern-id" | "course-feedback" | "exam-result" | "certificate-valid"
  >("");
  const [lockedReason, setLockedReason] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [previewScale, setPreviewScale] = useState(1);

  async function loadCertificate(): Promise<CertificateResponse> {
    const response = await fetch("/api/student/certificate", {
      headers: authHeaders(),
      cache: "no-store",
    });
    const json = (await response.json()) as CertificateResponse & { error?: string };
    if (!response.ok) {
      throw new Error(json.error ?? "Unable to verify certificate eligibility.");
    }
    return json;
  }

  async function createQrCode(verificationUrl: string): Promise<string> {
    const { default: QRCode } = await import("qrcode");
    return QRCode.toDataURL(verificationUrl, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: "#092f20", light: "#ffffff" },
    });
  }

  useEffect(() => {
    let cancelled = false;
    setCheckingEligibility(true);
    void loadCertificate()
      .then(async (result) => {
        if (!result.eligible) {
          if (!cancelled) {
            setCertificate(null);
            setRequirement(result.requirement);
            setLockedReason(result.reason);
          }
          return;
        }

        const qrUrl = await createQrCode(result.certificate.verificationUrl);
        if (!cancelled) {
          setCertificate(result.certificate);
          setRequirement("");
          setLockedReason("");
          setQrCodeUrl(qrUrl);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setCertificate(null);
          setError(caught instanceof Error ? caught.message : "Unable to verify certificate.");
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingEligibility(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void signatureDataUrl(`${window.location.origin}/signature.png`)
      .then((url) => {
        if (!cancelled) setSignatureUrl(url);
      })
      .catch(() => {
        if (!cancelled) setSignatureUrl("/signature.png");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    const updateScale = () => {
      const availableWidth = preview.clientWidth;
      setPreviewScale(Math.min(1, availableWidth / 1024));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(preview);
    return () => observer.disconnect();
  }, []);

  async function downloadCertificate() {
    setDownloading(true);
    setError(null);
    try {
      const result = await loadCertificate();
      if (!result.eligible) {
        setCertificate(null);
        setRequirement(result.requirement);
        setLockedReason(result.reason);
        throw new Error(result.reason);
      }
      const currentQrCode = await createQrCode(result.certificate.verificationUrl);
      setCertificate(result.certificate);
      setQrCodeUrl(currentQrCode);
      await downloadStudentCertificatePdf(application, {
        issueDate: formatCertificateDate(new Date(result.certificate.issuedAt)),
        qrCodeUrl: currentQrCode,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to generate certificate.");
    } finally {
      setDownloading(false);
    }
  }

  if (checkingEligibility) {
    return (
      <section className="student-certificate-panel">
        <p className="student-certificate-alert" role="status">
          Checking certificate eligibility…
        </p>
      </section>
    );
  }

  if (!certificate) {
    return (
      <section className="student-certificate-panel">
        <div className="student-certificate-locked">
          <h4>{requirement === "course-feedback" ? "Course review required" : "Certificate unavailable"}</h4>
          <p>{lockedReason || "Unable to verify certificate eligibility."}</p>
          {requirement === "course-feedback" ? (
            <button type="button" className="btn btn-green btn-sm" onClick={onRequestFeedback}>
              Add course review
            </button>
          ) : null}
          {error ? (
            <p className="student-certificate-alert student-certificate-alert--error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="student-certificate-panel">
      <div className="student-certificate-toolbar">
        <div>
          <h4>Certificate of Completion</h4>
          <p>Preview your dynamically generated certificate and download it as a PDF.</p>
        </div>
        <button
          type="button"
          className="btn btn-green btn-sm student-certificate-download"
          disabled={downloading || !application.internId}
          onClick={() => void downloadCertificate()}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {downloading ? "Generating…" : "Download certificate"}
        </button>
      </div>

      {!application.internId ? (
        <p className="student-certificate-alert" role="status">
          Your certificate will be available after your Intern ID is assigned.
        </p>
      ) : null}
      {error ? (
        <p className="student-certificate-alert student-certificate-alert--error" role="alert">
          {error}
        </p>
      ) : null}

      <div
        ref={previewRef}
        className="student-certificate-preview"
        style={{ height: `${724 * previewScale}px` }}
      >
        <div
          className="student-certificate-preview-stage"
          style={{ transform: `scale(${previewScale})` }}
        >
          <CertificateSheet
            student={application}
            issueDate={formatCertificateDate(new Date(certificate.issuedAt))}
            backgroundUrl="/certificate_bg.png"
            nitLogoUrl="/nitjsrlogo.png"
            governmentLogoUrl="/Jharkhand_Rajakiya_Chihna.svg"
            signatureUrl={signatureUrl}
            qrCodeUrl={qrCodeUrl}
          />
        </div>
      </div>
    </section>
  );
}
