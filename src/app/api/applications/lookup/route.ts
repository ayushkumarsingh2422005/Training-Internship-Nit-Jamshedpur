import { NextResponse } from "next/server";
import { toApplicationResponse } from "@/lib/application-response";
import connectDB from "@/lib/mongodb";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";
import { createStudentSessionToken } from "@/lib/student-session";
import Application from "@/models/Application";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; phoneNumber?: string };

    const email = normalizeEmail(body.email ?? "");
    const phoneNumber = normalizePhone(body.phoneNumber ?? "");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    if (phoneNumber.length !== 10) {
      return NextResponse.json(
        { error: "A valid 10-digit mobile number is required." },
        { status: 400 },
      );
    }

    await connectDB();

    const application = await Application.findOne({ email, phoneNumber }).lean();

    if (!application) {
      return NextResponse.json({ shortlisted: false });
    }

    const token = createStudentSessionToken(email, phoneNumber);

    return NextResponse.json({
      shortlisted: true,
      token,
      application: toApplicationResponse(application),
    });
  } catch (error) {
    console.error("POST /api/applications/lookup", error);
    return NextResponse.json({ error: "Unable to check shortlist status. Please try again." }, { status: 500 });
  }
}
