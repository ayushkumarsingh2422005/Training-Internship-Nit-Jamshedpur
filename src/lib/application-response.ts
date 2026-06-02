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
  aadharNumber?: string | null;
  collegeRegistrationNumber?: string | null;
  profileCorrectedAt?: unknown;
  hasLaptop?: boolean | null;
  laptopUpdatedAt?: unknown;
  internId?: string | null;
  hostellerVerificationFromAdmin?: boolean;
  hostellerVerificationAt?: unknown;
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

  const profileAt = doc.profileCorrectedAt;
  let profileCorrectedAt: string | null = null;
  if (profileAt != null && profileAt !== "") {
    const date = profileAt instanceof Date ? profileAt : new Date(String(profileAt));
    if (!Number.isNaN(date.getTime())) {
      profileCorrectedAt = date.toISOString();
    }
  }

  const hostellerAt = doc.hostellerVerificationAt;
  let hostellerVerificationAt: string | null = null;
  if (hostellerAt != null && hostellerAt !== "") {
    const date = hostellerAt instanceof Date ? hostellerAt : new Date(String(hostellerAt));
    if (!Number.isNaN(date.getTime())) {
      hostellerVerificationAt = date.toISOString();
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
    aadharNumber: doc.aadharNumber?.trim() || null,
    collegeRegistrationNumber: doc.collegeRegistrationNumber?.trim() || null,
    profileCorrectedAt,
    hasLaptop: doc.hasLaptop === true || doc.hasLaptop === false ? doc.hasLaptop : null,
    laptopUpdatedAt,
    internId: doc.internId?.trim() || null,
    hostellerVerificationFromAdmin: Boolean(doc.hostellerVerificationFromAdmin),
    hostellerVerificationAt,
  };
}
