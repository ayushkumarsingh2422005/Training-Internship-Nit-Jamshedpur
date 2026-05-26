export const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;

export type Gender = (typeof GENDER_OPTIONS)[number];

export function normalizeGender(value: string | null | undefined): Gender | null {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "male" || v === "m") return "Male";
  if (v === "female" || v === "f") return "Female";
  if (v === "other" || v === "others") return "Other";
  return null;
}

export function isValidGender(value: string | null | undefined): value is Gender {
  return normalizeGender(value) !== null;
}
