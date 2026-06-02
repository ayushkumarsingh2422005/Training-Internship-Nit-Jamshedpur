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

  const laptopAt = doc.laptopUpdatedAt;
  let laptopUpdatedAt: string | null = null;
  if (laptopAt != null && laptopAt !== "") {
    const date = laptopAt instanceof Date ? laptopAt : new Date(String(laptopAt));
    if (!Number.isNaN(date.getTime())) laptopUpdatedAt = date.toISOString();
  }

  const profileAt = doc.profileCorrectedAt;
  let profileCorrectedAt: string | null = null;
  if (profileAt != null && profileAt !== "") {
    const date = profileAt instanceof Date ? profileAt : new Date(String(profileAt));
    if (!Number.isNaN(date.getTime())) profileCorrectedAt = date.toISOString();
  }

  const hostellerAt = doc.hostellerVerificationAt;
  let hostellerVerificationAt: string | null = null;
  if (hostellerAt != null && hostellerAt !== "") {
    const date = hostellerAt instanceof Date ? hostellerAt : new Date(String(hostellerAt));
    if (!Number.isNaN(date.getTime())) hostellerVerificationAt = date.toISOString();
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
    aadharNumber: doc.aadharNumber?.trim() || null,
    collegeRegistrationNumber: doc.collegeRegistrationNumber?.trim() || null,
    profileCorrectedAt,
    hasLaptop: doc.hasLaptop === true || doc.hasLaptop === false ? doc.hasLaptop : null,
    laptopUpdatedAt,
    internId: doc.internId?.trim() || null,
    hostellerVerificationFromAdmin: Boolean(doc.hostellerVerificationFromAdmin),
    hostellerVerificationAt,
    createdAt,
    updatedAt,
  };
}
