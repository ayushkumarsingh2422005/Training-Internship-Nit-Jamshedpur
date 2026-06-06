import { NextResponse } from "next/server";
import { toAdminApplication } from "@/lib/admin-application";
import { getAdminSessionFromRequest } from "@/lib/admin-session";
import connectDB from "@/lib/mongodb";
import Application from "@/models/Application";

export const dynamic = "force-dynamic";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request, ["admin", "hostel_admin"]))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const internId = clean(searchParams.get("internId"));
    if (!internId) {
      return NextResponse.json({ error: "Intern ID is required." }, { status: 400 });
    }

    await connectDB();
    const application = await Application.findOne({ internId }).lean();
    if (!application) {
      return NextResponse.json({ error: "Student not found for this Intern ID." }, { status: 404 });
    }

    return NextResponse.json({ item: toAdminApplication(application) });
  } catch (error) {
    console.error("GET /api/admin/hostellers/lookup", error);
    return NextResponse.json({ error: "Failed to lookup student." }, { status: 500 });
  }
}
