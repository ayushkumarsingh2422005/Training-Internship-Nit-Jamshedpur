"use client";

import { useEffect, useRef, useState } from "react";
import { CertificateSheet } from "@/components/CertificateSheet";
import { formatCertificateDate } from "@/lib/certificate-meta";
import { signatureDataUrl } from "@/lib/id-card-assets";
import { downloadStudentCertificatePdf } from "@/lib/student-certificate-pdf";
import type { Application } from "@/types/application";

type StudentCertificatePanelProps = {
  application: Application;
};

export function StudentCertificatePanel({ application }: StudentCertificatePanelProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [previewScale, setPreviewScale] = useState(1);
  const issueDate = formatCertificateDate(new Date());

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
      await downloadStudentCertificatePdf(application);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to generate certificate.");
    } finally {
      setDownloading(false);
    }
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
          className="btn btn-green btn-sm"
          disabled={downloading || !application.internId}
          onClick={() => void downloadCertificate()}
        >
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
            issueDate={issueDate}
            backgroundUrl="/certificate_bg.png"
            nitLogoUrl="/nitjsrlogo.png"
            governmentLogoUrl="/Jharkhand_Rajakiya_Chihna.svg"
            signatureUrl={signatureUrl}
          />
        </div>
      </div>
    </section>
  );
}
