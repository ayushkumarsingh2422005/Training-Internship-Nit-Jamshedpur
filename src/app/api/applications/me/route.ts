import { NextResponse } from "next/server";
import { toApplicationResponse } from "@/lib/application-response";
import connectDB from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/student-session";
import Application from "@/models/Application";

export async function GET(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Session expired or invalid. Please sign in again." }, { status: 401 });
    }

    await connectDB();

    const application = await Application.findOne({
      email: session.email,
      phoneNumber: session.phoneNumber,
    }).lean();

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({
      shortlisted: true,
      application: toApplicationResponse(application),
    });
  } catch (error) {
    console.error("GET /api/applications/me", error);
    return NextResponse.json({ error: "Unable to load your result." }, { status: 500 });
  }
}
