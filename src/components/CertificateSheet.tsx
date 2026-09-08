"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  certificateMeta,
  certificateNumber,
  type CertificateStudent,
} from "@/lib/certificate-meta";

const NAME_MAX_FONT_PX = 48;
const NAME_MIN_FONT_PX = 22;

type CertificateSheetProps = {
  student: CertificateStudent;
  issueDate: string;
  backgroundUrl: string;
  nitLogoUrl: string;
  governmentLogoUrl: string;
  signatureUrl: string;
  qrCodeUrl: string;
};

function fitNameToWidth(el: HTMLElement): number {
  let nextSize = NAME_MAX_FONT_PX;
  el.style.fontSize = `${nextSize}px`;

  // Shrink until the full name fits on one line, without wrapping or clipping.
  while (nextSize > NAME_MIN_FONT_PX && el.scrollWidth > el.clientWidth + 1) {
    nextSize -= 1;
    el.style.fontSize = `${nextSize}px`;
  }

  return nextSize;
}

function FittedCertificateName({ name }: { name: string }) {
  const nameRef = useRef<HTMLElement>(null);
  const [fontSize, setFontSize] = useState(NAME_MAX_FONT_PX);

  useLayoutEffect(() => {
    const el = nameRef.current;
    if (!el) return;

    setFontSize(fitNameToWidth(el));

    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (cancelled || !nameRef.current) return;
      setFontSize(fitNameToWidth(nameRef.current));
    });

    return () => {
      cancelled = true;
    };
  }, [name]);

  return (
    <strong ref={nameRef} style={{ fontSize: `${fontSize}px` }}>
      {name}
    </strong>
  );
}

export function CertificateSheet({
  student,
  issueDate,
  backgroundUrl,
  nitLogoUrl,
  governmentLogoUrl,
  signatureUrl,
  qrCodeUrl,
}: CertificateSheetProps) {
  const courseName = [student.subject, student.subpart].filter(Boolean).join(" — ");

  return (
    <article
      className="certificate-sheet"
      aria-label={`Certificate of completion for ${student.fullName}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="certificate-sheet-bg" src={backgroundUrl} alt="" />

      <div className="certificate-sheet-content">
        <header className="certificate-sheet-header">
          <h1>CERTIFICATE</h1>
          <p>OF COMPLETION</p>
        </header>

        <div className="certificate-sheet-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={nitLogoUrl} alt="NIT Jamshedpur" />
        </div>

        <div className="certificate-sheet-logo certificate-sheet-logo--government">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={governmentLogoUrl} alt="Government of Jharkhand" />
        </div>

        <section className="certificate-sheet-recipient">
          <p className="certificate-sheet-certify">This is to certify that</p>
          <p className="certificate-sheet-number">{certificateNumber(student)}</p>
          <div className="certificate-sheet-name-row">
            <span aria-hidden="true">●</span>
            <FittedCertificateName name={student.fullName} />
            <span aria-hidden="true">●</span>
          </div>
          <p className="certificate-sheet-copy">
            has successfully completed the {certificateMeta.programmeDuration} conducted by
          </p>
          <p className="certificate-sheet-organization">{certificateMeta.organization}</p>
          <p className="certificate-sheet-collaboration">in collaboration with</p>
          <p className="certificate-sheet-department">{certificateMeta.collaborator}</p>
          {courseName ? (
            <p className="certificate-sheet-course">
              for the course <strong>{courseName}</strong>
            </p>
          ) : null}
        </section>

        <footer className="certificate-sheet-footer">
          <div className="certificate-sheet-date">
            <span>Certificate issuance date:</span>
            <strong>{issueDate}</strong>
          </div>

          <div className="certificate-sheet-qr">
            {qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrCodeUrl} alt="Scan to verify certificate" />
            ) : (
              <div className="certificate-sheet-qr-placeholder" aria-hidden="true" />
            )}
            <span>Scan to verify</span>
          </div>

          <div className="certificate-sheet-signatory">
            {signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signatureUrl} alt="" />
            ) : (
              <div className="certificate-sheet-signature-placeholder" aria-hidden="true" />
            )}
            <div className="certificate-sheet-sign-line" />
            <span>{certificateMeta.signatoryTitle}</span>
            <strong>{certificateMeta.signatoryOrganization}</strong>
          </div>
        </footer>
      </div>
    </article>
  );
}
