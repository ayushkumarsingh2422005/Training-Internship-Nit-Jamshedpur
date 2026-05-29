import { NextResponse } from "next/server";
import { toApplicationResponse } from "@/lib/application-response";
import {
  COLLEGE_OTHER,
  isValidCollegeSelection,
  resolveCollegeName,
} from "@/lib/government-colleges";
import { isValidGender } from "@/lib/gender";
import connectDB from "@/lib/mongodb";
import { isValidAadhar, normalizeAadhar } from "@/lib/profile";
import { getSessionFromRequest } from "@/lib/student-session";
import Application from "@/models/Application";

type ProfilePayload = {
  fullName?: string;
  fatherName?: string;
  schoolName?: string;
  /** Dropdown choice — used to set collegeName on save. */
  collegeDropdown?: string;
  /** Custom college name when collegeDropdown is Other. */
  otherCollegeName?: string;
  address?: string;
  gender?: string;
  aadharNumber?: string;
  collegeRegistrationNumber?: string;
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
    const address = clean(body.address);
    const collegeDropdown = clean(body.collegeDropdown);
    const otherCollegeName = clean(body.otherCollegeName);
    const gender = clean(body.gender);
    const aadharNumber = normalizeAadhar(clean(body.aadharNumber));
    const collegeRegistrationNumber = clean(body.collegeRegistrationNumber);

    if (!fullName || !fatherName || !schoolName || !address) {
      return NextResponse.json({ error: "Name, guardian, school, and address are required." }, { status: 400 });
    }

    if (!isValidCollegeSelection(collegeDropdown)) {
      return NextResponse.json({ error: "Please select your government polytechnic from the list." }, { status: 400 });
    }

    const collegeName = resolveCollegeName(collegeDropdown, otherCollegeName);
    if (!collegeName) {
      return NextResponse.json(
        { error: "Please enter your college name when selecting Other." },
        { status: 400 },
      );
    }

    if (!isValidGender(gender)) {
      return NextResponse.json({ error: "Please select your gender." }, { status: 400 });
    }

    if (!isValidAadhar(aadharNumber)) {
      return NextResponse.json({ error: "Please enter a valid 12-digit Aadhaar number." }, { status: 400 });
    }

    if (!collegeRegistrationNumber) {
      return NextResponse.json({ error: "College registration number is required." }, { status: 400 });
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
          gender,
          aadharNumber,
          collegeRegistrationNumber,
          profileCorrectedAt: new Date(),
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
