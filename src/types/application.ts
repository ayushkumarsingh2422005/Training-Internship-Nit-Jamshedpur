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
  gender?: string | null;
  aadharNumber?: string | null;
  collegeRegistrationNumber?: string | null;
  profileCorrectedAt?: string | null;
  hasLaptop?: boolean | null;
  laptopUpdatedAt?: string | null;
  internId?: string | null;
};
