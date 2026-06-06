import { NextResponse } from "next/server";
import { verifyAdminCredentials } from "@/lib/admin-auth";
import { adminSessionCookie, createAdminSessionToken } from "@/lib/admin-session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const auth = verifyAdminCredentials(email, password);
    if (!auth.ok) {
      return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
    }

    const token = await createAdminSessionToken(email, auth.role);
    const response = NextResponse.json({ success: true, role: auth.role });
    response.cookies.set(adminSessionCookie.name, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: adminSessionCookie.maxAgeSec,
    });
    return response;
  } catch (error) {
    console.error("POST /api/admin/login", error);
    return NextResponse.json({ error: "Login failed. Check server configuration." }, { status: 500 });
  }
}
