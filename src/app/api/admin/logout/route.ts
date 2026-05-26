import { NextResponse } from "next/server";
import { adminSessionCookie } from "@/lib/admin-session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(adminSessionCookie.name, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
