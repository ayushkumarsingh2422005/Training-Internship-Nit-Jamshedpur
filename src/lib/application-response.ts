import type { Application } from "@/types/application";

/** Mongoose lean document or plain object from DB */
export type DbApplicationInput = {
  fullName: string;
  fatherName: string;
  schoolName: string;
  collegeName: string;
  address: string;
  phoneNumber: string;
  email: string;
  subject: string;
  subpart: string;
  wantsAccommodation?: boolean | null;
  accommodationEnrolledAt?: unknown;
  gender?: string | null;
  hasLaptop?: boolean | null;
  laptopUpdatedAt?: unknown;
};

export function toApplicationResponse(doc: DbApplicationInput): Application {
  const enrolledAt = doc.accommodationEnrolledAt;
  let accommodationEnrolledAt: string | null = null;
  if (enrolledAt != null && enrolledAt !== "") {
    const date = enrolledAt instanceof Date ? enrolledAt : new Date(String(enrolledAt));
    if (!Number.isNaN(date.getTime())) {
      accommodationEnrolledAt = date.toISOString();
    }
  }

  const laptopAt = doc.laptopUpdatedAt;
  let laptopUpdatedAt: string | null = null;
  if (laptopAt != null && laptopAt !== "") {
    const date = laptopAt instanceof Date ? laptopAt : new Date(String(laptopAt));
    if (!Number.isNaN(date.getTime())) {
      laptopUpdatedAt = date.toISOString();
    }
  }

  return {
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
    hasLaptop: doc.hasLaptop === true || doc.hasLaptop === false ? doc.hasLaptop : null,
    laptopUpdatedAt,
  };
}
