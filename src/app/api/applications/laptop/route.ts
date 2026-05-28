import { NextResponse } from "next/server";
import { toApplicationResponse } from "@/lib/application-response";
import connectDB from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/student-session";
import Application from "@/models/Application";

export async function POST(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    const body = (await request.json()) as { hasLaptop?: boolean };
    if (typeof body.hasLaptop !== "boolean") {
      return NextResponse.json({ error: "Please select Yes or No for laptop availability." }, { status: 400 });
    }

    await connectDB();

    const application = await Application.findOneAndUpdate(
      { email: session.email, phoneNumber: session.phoneNumber },
      { $set: { hasLaptop: body.hasLaptop, laptopUpdatedAt: new Date() } },
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
    console.error("POST /api/applications/laptop", error);
    return NextResponse.json({ error: "Unable to save laptop status. Please try again." }, { status: 500 });
  }
}
