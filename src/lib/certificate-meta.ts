import type { Application } from "@/types/application";

export type CertificateStudent = Pick<
  Application,
  "fullName" | "internId" | "collegeName" | "subject" | "subpart"
>;

export const certificateMeta = {
  programmeDuration: "6-week residential internship programme",
  organization: "National Institute of Technology, Jamshedpur",
  collaborator: "Department of Higher & Technical Education (DHTE)",
  signatoryTitle: "Nodal Officer",
  signatoryOrganization: "NIT Jamshedpur",
} as const;

export function certificateNumber(student: CertificateStudent): string {
  return student.internId?.trim() || "Certificate number pending";
}

export function certificateFileName(student: CertificateStudent): string {
  const slug = (student.internId || student.fullName || "student")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `certificate-${slug || "student"}.pdf`;
}

export function formatCertificateDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
