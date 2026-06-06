import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-session";

export async function GET(request: Request) {
  const session = await getAdminSessionFromRequest(request, ["admin", "hostel_admin"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    role: session.role,
    email: session.email,
  });
}
