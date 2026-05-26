import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.local");
  }

  return safeEqual(email.trim().toLowerCase(), adminEmail) && safeEqual(password, adminPassword);
}
