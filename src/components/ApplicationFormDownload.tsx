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
};

type FormRow =
  | { kind: "wide"; field: FormField }
  | { kind: "pair"; left: FormField; right: FormField | null };

const PHOTO_ROW_SPAN = 7;

function displayValue(value: string | null | undefined, fallback = "—"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function displayBoolean(value: boolean | null | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function buildRows(application: Application): FormRow[] {
  return [
    {
      kind: "wide",
      field: { label: "Intern ID", value: displayValue(application.internId) },
    },
    { kind: "wide", field: { label: "Full name of candidate", value: displayValue(application.fullName) } },
    {
      kind: "wide",
      field: { label: "Father's / guardian's name", value: displayValue(application.fatherName) },
    },
    {
      kind: "pair",
      left: { label: "Gender", value: displayValue(application.gender) },
      right: {
        label: "Aadhaar number",
        value: application.aadharNumber ? formatAadharDisplay(application.aadharNumber) : "—",
      },
    },
    {
      kind: "pair",
      left: {
        label: "College registration no.",
        value: displayValue(application.collegeRegistrationNumber),
      },
      right: null,
    },
    {
      kind: "wide",
      field: {
        label: "Government polytechnic / college",
        value: displayValue(application.collegeName),
      },
    },
    {
      kind: "wide",
      field: {
        label: "School / institution last attended",
        value: displayValue(application.schoolName),
      },
    },
    {
      kind: "pair",
      left: { label: "Engineering discipline (subject)", value: displayValue(application.subject) },
      right: { label: "Training module allotted (subpart)", value: displayValue(application.subpart) },
    },
    {
      kind: "pair",
      left: { label: "Email address", value: displayValue(application.email) },
      right: { label: "Mobile number", value: displayValue(application.phoneNumber) },
    },
    {
      kind: "wide",
      field: { label: "Residential address", value: displayValue(application.address) },
    },
    {
      kind: "pair",
      left: {
        label: "Hostel accommodation required",
        value: displayBoolean(application.wantsAccommodation),
      },
      right: { label: "Personal laptop available", value: displayBoolean(application.hasLaptop) },
    },
  ];
}

function FormFieldCell({ field }: { field: FormField }) {
  return (
    <div className="application-form-field">
      <span className="application-form-field-label">{field.label}</span>
      <span className="application-form-field-value">{field.value}</span>
    </div>
  );
}

function ApplicationFormDocument({ application }: Props) {
  const rows = buildRows(application);

  return (
    <article className="application-form-print">
      <ApplicationFormHeader />

      <table className="application-form-table">
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.kind === "wide" ? row.field.label : `${row.left.label}-${row.right?.label ?? "empty"}`}>
              {row.kind === "wide" ? (
                <td colSpan={2} className="application-form-cell">
                  <FormFieldCell field={row.field} />
                </td>
              ) : (
                <>
                  <td className="application-form-cell">
                    <FormFieldCell field={row.left} />
                  </td>
                  <td className="application-form-cell">
                    {row.right ? <FormFieldCell field={row.right} /> : null}
                  </td>
                </>
              )}
              {index === 0 ? (
                <td rowSpan={PHOTO_ROW_SPAN} className="application-form-photo-cell">
                  <div className="application-form-photo-box">
                    <span>{applicationFormMeta.photoLabel}</span>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

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
