import { NextResponse } from "next/server";
import { toAdminApplication } from "@/lib/admin-application";
import { getAdminSessionFromRequest } from "@/lib/admin-session";
import connectDB from "@/lib/mongodb";
import Application from "@/models/Application";

export const dynamic = "force-dynamic";

type EnrollPayload = {
  internId?: string;
  enroll?: boolean;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const items = await Application.find({ hostellerVerificationFromAdmin: true })
      .sort({ fullName: 1 })
      .lean();

    return NextResponse.json({ items: items.map((doc) => toAdminApplication(doc)) });
  } catch (error) {
    console.error("GET /api/admin/hostellers", error);
    return NextResponse.json({ error: "Failed to load hostellers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as EnrollPayload;
    const internId = clean(body.internId);
    if (!internId) {
      return NextResponse.json({ error: "Intern ID is required." }, { status: 400 });
    }

    const enroll = body.enroll !== false;

    await connectDB();
    const updated = await Application.findOneAndUpdate(
      { internId },
      {
        $set: {
          hostellerVerificationFromAdmin: enroll,
          hostellerVerificationAt: enroll ? new Date() : null,
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Student not found for this Intern ID." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: enroll ? "Student enrolled as hosteller." : "Hosteller enrollment removed.",
      item: toAdminApplication(updated),
    });
  } catch (error) {
    console.error("POST /api/admin/hostellers", error);
    return NextResponse.json({ error: "Failed to update hosteller enrollment." }, { status: 500 });
  }
}
