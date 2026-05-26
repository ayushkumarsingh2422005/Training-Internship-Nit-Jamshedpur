import { createHmac, timingSafeEqual } from "crypto";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type SessionPayload = {
  email: string;
  phoneNumber: string;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set in .env.local (at least 16 characters)");
  }
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createStudentSessionToken(email: string, phoneNumber: string): string {
  const payload: SessionPayload = {
    email: normalizeEmail(email),
    phoneNumber: normalizePhone(phoneNumber),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifyStudentSessionToken(token: string): SessionPayload | null {
  try {
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;

    const expected = sign(body);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as SessionPayload;
    if (!payload.email || !payload.phoneNumber || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;

    return {
      email: normalizeEmail(payload.email),
      phoneNumber: normalizePhone(payload.phoneNumber),
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export function getSessionFromRequest(request: Request): SessionPayload | null {
  const token = getBearerToken(request);
  if (!token) return null;
  return verifyStudentSessionToken(token);
}
