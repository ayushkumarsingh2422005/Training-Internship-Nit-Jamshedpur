const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const COOKIE_NAME = "admin_session";
const textEncoder = new TextEncoder();

export type AdminRole = "admin" | "hostel_admin";

export type AdminSessionPayload = {
  role: AdminRole;
  email: string;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set in .env.local (at least 16 characters)");
  }
  return secret;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(data));
  return Buffer.from(signature).toString("base64url");
}

export async function createAdminSessionToken(
  adminEmail: string,
  role: AdminRole = "admin",
): Promise<string> {
  const payload: AdminSessionPayload = {
    role,
    email: adminEmail.trim().toLowerCase(),
    exp: Date.now() + ADMIN_SESSION_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${await sign(body)}`;
}

export async function verifyAdminSessionToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;

    const expected = await sign(body);
    if (!timingSafeEqualStr(signature, expected)) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as AdminSessionPayload;
    if (!payload.email || !payload.exp) return null;
    if (payload.role !== "admin" && payload.role !== "hostel_admin") return null;
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function getAdminSessionFromRequest(
  request: Request,
  allowedRoles: AdminRole[] = ["admin"],
): Promise<AdminSessionPayload | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  const token = match?.[1] ? decodeURIComponent(match[1]) : null;
  if (!token) return null;

  const session = await verifyAdminSessionToken(token);
  if (!session) return null;
  if (!allowedRoles.includes(session.role)) return null;
  return session;
}

export const adminSessionCookie = {
  name: COOKIE_NAME,
  maxAgeSec: ADMIN_SESSION_TTL_MS / 1000,
} as const;
