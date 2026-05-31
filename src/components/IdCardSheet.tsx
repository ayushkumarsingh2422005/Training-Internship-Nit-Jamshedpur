"use client";

import { useEffect, useId, useRef } from "react";
import { idCardMeta } from "@/lib/id-card-meta";
import type { Application } from "@/types/application";

type Props = {
  application: Application;
  nitLogoUrl: string;
  govEmblemUrl: string;
  signatureUrl: string;
};

function displayValue(value: string | null | undefined, fallback = "—"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function splitDisplayName(fullName: string): { first: string; rest: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "—", rest: "" };
  if (parts.length === 1) return { first: parts[0], rest: "" };
  return { first: parts[0], rest: parts.slice(1).join(" ") };
}

function IdCardBackground() {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      className="id-card-bg-svg"
      viewBox="0 0 540 856"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}-green`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#144720" />
          <stop offset="100%" stopColor="#1a5c28" />
        </linearGradient>
        <linearGradient id={`${uid}-sweep`} x1="1" y1="0.2" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#c8e6c9" stopOpacity="0.75" />
          <stop offset="55%" stopColor="#e8f5e9" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <pattern
          id={`${uid}-stripes`}
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-45)"
        >
          <rect width="16" height="16" fill="#ffffff" />
          <rect width="6" height="16" fill="#eef7ef" />
        </pattern>
      </defs>

      <rect x="0" y="0" width="540" height="856" fill={`url(#${uid}-stripes)`} />
      <polygon points="0,0 540,0 540,248 0,328" fill={`url(#${uid}-green)`} />
      <polygon points="0,328 540,248 540,856 0,856" fill="#ffffff" />
      <polygon points="248,272 540,248 540,856 160,856" fill={`url(#${uid}-sweep)`} />
      <line x1="0" y1="324" x2="540" y2="244" stroke="#f9a825" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function IdCardHeader({
  nitLogoUrl,
  govEmblemUrl,
  centered = false,
}: {
  nitLogoUrl: string;
  govEmblemUrl: string;
  centered?: boolean;
}) {
  return (
    <header className={`id-card-header${centered ? " id-card-header-centered" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={nitLogoUrl} alt="" className="id-card-logo" width={512} height={512} />
      <div className="id-card-header-text">
        <p className="id-card-org">{idCardMeta.organization}</p>
        <p className="id-card-tagline">{idCardMeta.tagline}</p>
        {centered ? <p className="id-card-dept">{idCardMeta.department}</p> : null}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={govEmblemUrl} alt="" className="id-card-logo id-card-emblem" width={512} height={512} />
    </header>
  );
}

function DataRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="id-card-data-row">
      <span className="id-card-data-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="id-card-data-label">{label}</span>
      <span className="id-card-data-value">{value}</span>
    </div>
  );
}

function IdCardBarcode({ value, compact = false }: { value: string; compact?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !value || value === "—" || value === "Pending") return;

    void import("jsbarcode").then(({ default: JsBarcode }) => {
      JsBarcode(svg, value, {
        format: "CODE128",
        displayValue: true,
        fontSize: compact ? 9 : 10,
        height: compact ? 30 : 36,
        margin: 1,
        width: compact ? 1.2 : 1.35,
        textMargin: 2,
      });
    });
  }, [compact, value]);

  return (
    <svg
      ref={svgRef}
      className={`id-card-barcode-svg${compact ? " id-card-barcode-svg-compact" : ""}`}
      role="img"
      aria-label={`Barcode ${value}`}
    />
  );
}

export function IdCardSheet({ application, nitLogoUrl, govEmblemUrl, signatureUrl }: Props) {
  const internId = displayValue(application.internId, "Pending");
  const barcodeValue = application.internId?.trim() || application.email.trim();
  const { first: nameFirst, rest: nameRest } = splitDisplayName(application.fullName);

  return (
    <div className="id-card-page">
      <article className="id-card id-card-front">
        <div className="id-card-bg" aria-hidden="true">
          <IdCardBackground />
        </div>

        <IdCardHeader nitLogoUrl={nitLogoUrl} govEmblemUrl={govEmblemUrl} />

        <div className="id-card-photo-frame">
          <span className="id-card-photo-icon" aria-hidden="true">
            👤
          </span>
          <span className="id-card-photo-label">{idCardMeta.photoLabel}</span>
        </div>

        <div className="id-card-content-panel id-card-front-panel">
          <h2 className="id-card-name">
            <span className="id-card-name-first">{nameFirst.toUpperCase()}</span>
            {nameRest ? ` ${nameRest.toUpperCase()}` : ""}
          </h2>
          <p className="id-card-role">{idCardMeta.designation}</p>

          <div className="id-card-data-list">
            <DataRow icon="▣" label="ID" value={internId} />
            <DataRow icon="◉" label="Module" value={displayValue(application.subpart)} />
            <DataRow icon="✉" label="Email" value={displayValue(application.email)} />
            <DataRow icon="☎" label="Phone" value={displayValue(application.phoneNumber)} />
          </div>

          <footer className="id-card-front-footer">
            <div className="id-card-barcode-wrap">
              <IdCardBarcode value={barcodeValue} compact />
            </div>
          </footer>
        </div>
      </article>

      <article className="id-card id-card-back">
        <div className="id-card-bg" aria-hidden="true">
          <IdCardBackground />
        </div>

        <IdCardHeader nitLogoUrl={nitLogoUrl} govEmblemUrl={govEmblemUrl} centered />

        <div className="id-card-content-panel id-card-back-panel">
          <p className="id-card-type-badge">{idCardMeta.cardType}</p>

          <div className="id-card-back-field">
            <span className="id-card-back-label">Address</span>
            <p className="id-card-back-value">{displayValue(application.address)}</p>
          </div>

          <div className="id-card-back-field">
            <span className="id-card-back-label">Father / guardian name</span>
            <p className="id-card-back-value">{displayValue(application.fatherName)}</p>
          </div>

          <div className="id-card-data-list">
            <DataRow icon="◈" label="Branch" value={displayValue(application.subject)} />
            <DataRow icon="▤" label="Reg. no." value={displayValue(application.collegeRegistrationNumber)} />
            <DataRow icon="◉" label="Module" value={displayValue(application.subpart)} />
          </div>

          <p className="id-card-college-line">{displayValue(application.collegeName)}</p>

          <div className="id-card-signature-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signatureUrl} alt="" className="id-card-signature-img" width={640} height={256} />
            <p className="id-card-signature-label">{idCardMeta.signatureLabel}</p>
          </div>

          <footer className="id-card-back-footer">
            <div className="id-card-back-meta">
              <p>
                <strong>Issue date :</strong> {idCardMeta.issueDate}
              </p>
              <p>
                <strong>Valid till :</strong> {idCardMeta.expireDate}
              </p>
              <p className="id-card-return-notice">{idCardMeta.returnNotice}</p>
            </div>
            <div className="id-card-barcode-wrap">
              <IdCardBarcode value={barcodeValue} />
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
}
