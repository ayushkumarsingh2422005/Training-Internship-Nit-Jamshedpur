"use client";

import { useCallback, useRef, useState } from "react";
import { applicationFormMeta, applicationFormSignatures } from "@/lib/application-form";
import { downloadApplicationFormPdf } from "@/lib/application-form-pdf";
import { ApplicationFormHeader } from "@/components/ApplicationFormHeader";
import { formatAadharDisplay, isProfileComplete } from "@/lib/profile";
import type { Application } from "@/types/application";

type Props = {
  application: Application;
};

type FormField = {
  label: string;
  value: string;
  wide?: boolean;
};

function displayValue(value: string | null | undefined, fallback = "—"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function displayBoolean(value: boolean | null | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function buildFields(application: Application): FormField[] {
  return [
    { label: "Full name of candidate", value: displayValue(application.fullName), wide: true },
    { label: "Father's / guardian's name", value: displayValue(application.fatherName), wide: true },
    { label: "Gender", value: displayValue(application.gender) },
    {
      label: "Aadhaar number",
      value: application.aadharNumber ? formatAadharDisplay(application.aadharNumber) : "—",
    },
    { label: "College registration no.", value: displayValue(application.collegeRegistrationNumber) },
    { label: "Government polytechnic / college", value: displayValue(application.collegeName), wide: true },
    { label: "School / institution last attended", value: displayValue(application.schoolName), wide: true },
    { label: "Engineering discipline (subject)", value: displayValue(application.subject) },
    { label: "Training module allotted (subpart)", value: displayValue(application.subpart) },
    { label: "Email address", value: displayValue(application.email) },
    { label: "Mobile number", value: displayValue(application.phoneNumber) },
    { label: "Residential address", value: displayValue(application.address), wide: true },
    { label: "Hostel accommodation required", value: displayBoolean(application.wantsAccommodation) },
    { label: "Personal laptop available", value: displayBoolean(application.hasLaptop) },
  ];
}

function ApplicationFormDocument({ application }: Props) {
  const fields = buildFields(application);

  return (
    <article className="application-form-print">
      <ApplicationFormHeader />

      <div className="application-form-body">
        <div className="application-form-fields-grid">
          {fields.map((field) => (
            <div
              key={field.label}
              className={`application-form-field${field.wide ? " application-form-field-wide" : ""}`}
            >
              <span className="application-form-field-label">{field.label}</span>
              <span className="application-form-field-value">{field.value}</span>
            </div>
          ))}
        </div>

        <div className="application-form-photo-box">
          <span>{applicationFormMeta.photoLabel}</span>
        </div>
      </div>

      <section className="application-form-declaration">
        <h4>Declaration</h4>
        <p>{applicationFormMeta.declaration}</p>
      </section>

      <div className="application-form-signatures">
        {applicationFormSignatures.map((block) => (
          <div key={block.label} className="application-form-sign-block">
            <div className="application-form-sign-line" aria-hidden="true" />
            <p className="application-form-sign-label">{block.label}</p>
            <p className="application-form-sign-sub">{block.sub}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export function ApplicationFormDownload({ application }: Props) {
  const formRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileComplete = isProfileComplete(application);

  const handleDownload = useCallback(async () => {
    if (!profileComplete) return;

    const node = formRef.current;
    if (!node) return;

    setDownloading(true);
    setError(null);

    try {
      await downloadApplicationFormPdf(node, application.fullName);
    } catch {
      setError("Could not generate the PDF. Please try again in a moment.");
    } finally {
      setDownloading(false);
    }
  }, [application.fullName, profileComplete]);

  if (!profileComplete) {
    return (
      <div className="application-form-wrap">
        <div className="application-form-download-panel application-form-locked">
          <p className="application-form-download-lead">
            Complete your profile in the <strong>Profile Info</strong> tab first — including college, Aadhaar,
            gender, and college registration number. The application form unlocks after your profile is saved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="application-form-wrap">
      <div className="application-form-download-panel">
        <p className="application-form-download-lead">
          Download your pre-filled application form as a PDF. Sign where indicated before reporting to campus.
        </p>
        <button type="button" className="btn btn-green" onClick={handleDownload} disabled={downloading}>
          {downloading ? "Preparing PDF…" : "Download application form (PDF)"}
        </button>
        {error ? (
          <p className="application-form-download-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div ref={formRef} className="application-form-capture" aria-hidden="true">
        <ApplicationFormDocument application={application} />
      </div>
    </div>
  );
}
