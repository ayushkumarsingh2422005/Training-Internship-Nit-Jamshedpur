import { NextResponse } from "next/server";
import { toApplicationResponse } from "@/lib/application-response";
import connectDB from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/student-session";
import Application from "@/models/Application";

type ProfilePayload = {
  fullName?: string;
  fatherName?: string;
  schoolName?: string;
  collegeName?: string;
  address?: string;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    const body = (await request.json()) as ProfilePayload;
    const fullName = clean(body.fullName);
    const fatherName = clean(body.fatherName);
    const schoolName = clean(body.schoolName);
    const collegeName = clean(body.collegeName);
    const address = clean(body.address);

    if (!fullName || !fatherName || !schoolName || !collegeName || !address) {
      return NextResponse.json({ error: "All basic profile fields are required." }, { status: 400 });
    }

    await connectDB();

    const application = await Application.findOneAndUpdate(
      { email: session.email, phoneNumber: session.phoneNumber },
      {
        $set: {
          fullName,
          fatherName,
          schoolName,
          collegeName,
          address,
        },
      },
      { new: true },
    ).lean();

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      application: toApplicationResponse(application),
    });
  } catch (error) {
    console.error("PATCH /api/applications/profile", error);
    return NextResponse.json({ error: "Unable to update profile. Please try again." }, { status: 500 });
  }
}
