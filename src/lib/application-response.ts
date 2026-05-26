import type { Application } from "@/types/application";

type DbApplication = Application & {
  wantsAccommodation?: boolean | null;
  accommodationEnrolledAt?: Date | string | null;
};

export function toApplicationResponse(doc: DbApplication) {
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
    accommodationEnrolledAt: doc.accommodationEnrolledAt
      ? new Date(doc.accommodationEnrolledAt).toISOString()
      : null,
  };
}
