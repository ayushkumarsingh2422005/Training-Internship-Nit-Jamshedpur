import { timingSafeEqual } from "crypto";

export type AdminRole = "admin" | "hostel_admin";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function parseCredentialList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function verifyAdminCredentials(
  email: string,
  password: string,
): { ok: true; role: AdminRole } | { ok: false } {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.local");
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (safeEqual(normalizedEmail, adminEmail) && safeEqual(password, adminPassword)) {
    return { ok: true, role: "admin" };
  }

  const hostelEmails = parseCredentialList(process.env.HOSTEL_ADMIN_EMAIL).map((item) =>
    item.toLowerCase(),
  );
  const hostelPasswords = parseCredentialList(process.env.HOSTEL_ADMIN_PASSWORD);

  if (hostelEmails.length !== hostelPasswords.length) {
    throw new Error(
      "HOSTEL_ADMIN_EMAIL and HOSTEL_ADMIN_PASSWORD must have matching comma-separated entries.",
    );
  }

  for (let i = 0; i < hostelEmails.length; i += 1) {
    if (safeEqual(normalizedEmail, hostelEmails[i]) && safeEqual(password, hostelPasswords[i])) {
      return { ok: true, role: "hostel_admin" };
    }
  }

  return { ok: false };
}
