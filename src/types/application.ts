/** Shortlisted application shape (matches public/data.json). */
export type Application = {
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
  accommodationEnrolledAt?: string | null;
};
