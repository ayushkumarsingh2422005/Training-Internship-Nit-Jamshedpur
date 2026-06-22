import { SignJWT, jwtVerify } from "jose";

const secretKey = process.env.JWT_SECRET_KEY || "fallback_secret_for_development";
const key = new TextEncoder().encode(secretKey);

export async function createTeacherSessionToken(email: string, phoneNumber: string) {
  return await new SignJWT({ email, phoneNumber, role: "teacher" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyTeacherSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key);
    if (payload.role !== "teacher") return null;
    return payload as { email: string; phoneNumber: string; role: "teacher" };
  } catch {
    return null;
  }
}
