import { NextResponse } from "next/server";
import { toApplicationResponse } from "@/lib/application-response";
import { isValidGender } from "@/lib/gender";
import connectDB from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/student-session";
import Application from "@/models/Application";

export async function POST(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    const body = (await request.json()) as {
      wantsAccommodation?: boolean;
      gender?: string;
    };
    const wantsAccommodation = body.wantsAccommodation;

    if (typeof wantsAccommodation !== "boolean") {
      return NextResponse.json(
        { error: "Please select Yes or No for accommodation." },
        { status: 400 },
      );
    }

    if (wantsAccommodation && !isValidGender(body.gender)) {
      return NextResponse.json(
        { error: "Please select your gender for hostel accommodation." },
        { status: 400 },
      );
    }

    await connectDB();

    const update: Record<string, unknown> = {
      wantsAccommodation,
      accommodationEnrolledAt: new Date(),
      gender: wantsAccommodation ? body.gender!.trim() : null,
    };

    const application = await Application.findOneAndUpdate(
      { email: session.email, phoneNumber: session.phoneNumber },
      { $set: update },
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
    console.error("POST /api/applications/accommodation", error);
    return NextResponse.json(
      { error: "Unable to save accommodation preference. Please try again." },
      { status: 500 },
    );
  }
}
