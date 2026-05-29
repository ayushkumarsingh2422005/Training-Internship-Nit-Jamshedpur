import type { Application } from "@/types/application";
import { isValidGender } from "@/lib/gender";

export function normalizeAadhar(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatAadharDisplay(value: string): string {
  const digits = normalizeAadhar(value);
  if (digits.length !== 12) return value.trim();
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
}

export function isValidAadhar(value: string): boolean {
  return /^\d{12}$/.test(normalizeAadhar(value));
}

/** Profile saved through the updated form (dropdown college + mandatory fields). */
export function isProfileComplete(application: Application): boolean {
  return Boolean(
    application.profileCorrectedAt &&
      application.aadharNumber?.trim() &&
      isValidAadhar(application.aadharNumber) &&
      isValidGender(application.gender) &&
      application.collegeRegistrationNumber?.trim() &&
      application.collegeName?.trim(),
  );
}
