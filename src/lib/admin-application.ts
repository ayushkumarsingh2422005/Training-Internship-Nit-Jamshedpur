import type { Application } from "@/types/application";
import type { DbApplicationInput } from "@/lib/application-response";

export type AdminApplication = Application & {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type AdminDoc = DbApplicationInput & {
  _id?: { toString(): string };
  createdAt?: unknown;
  updatedAt?: unknown;
};

export function toAdminApplication(doc: AdminDoc): AdminApplication {
  const enrolledAt = doc.accommodationEnrolledAt;
  let accommodationEnrolledAt: string | null = null;
  if (enrolledAt != null && enrolledAt !== "") {
    const date = enrolledAt instanceof Date ? enrolledAt : new Date(String(enrolledAt));
    if (!Number.isNaN(date.getTime())) accommodationEnrolledAt = date.toISOString();
  }

  let createdAt: string | null = null;
  let updatedAt: string | null = null;
  const created = doc.createdAt;
  const updated = doc.updatedAt;
  if (created) {
    const d = created instanceof Date ? created : new Date(String(created));
    if (!Number.isNaN(d.getTime())) createdAt = d.toISOString();
  }
  if (updated) {
    const d = updated instanceof Date ? updated : new Date(String(updated));
    if (!Number.isNaN(d.getTime())) updatedAt = d.toISOString();
  }

  return {
    id: doc._id?.toString() ?? "",
    fullName: doc.fullName,
    fatherName: doc.fatherName,
    schoolName: doc.schoolName,
    collegeName: doc.collegeName,
    address: doc.address,
    phoneNumber: doc.phoneNumber,
    email: doc.email,
    subject: doc.subject,
    subpart: doc.subpart,
    wantsAccommodation:
      doc.wantsAccommodation === true || doc.wantsAccommodation === false
        ? doc.wantsAccommodation
        : null,
    accommodationEnrolledAt,
    gender: doc.gender?.trim() || null,
    createdAt,
    updatedAt,
  };
}
