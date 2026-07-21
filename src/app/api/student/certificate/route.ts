import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/student-session";
import connectDB from "@/lib/mongodb";
import Application from "@/models/Application";
import Certificate from "@/models/Certificate";
import CourseFeedback from "@/models/CourseFeedback";

export async function GET(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    await connectDB();
    const application = await Application.findOne({
      email: session.email,
      phoneNumber: session.phoneNumber,
    }).lean();

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (!application.internId?.trim()) {
      return NextResponse.json({
        eligible: false,
        requirement: "intern-id",
        reason: "Your Intern ID must be assigned before a certificate can be issued.",
      });
    }

    const hasFeedback = Boolean(
      await CourseFeedback.exists({ applicationId: application._id }),
    );
    if (!hasFeedback) {
      return NextResponse.json({
        eligible: false,
        requirement: "course-feedback",
        reason: "Please add a course review before viewing or downloading your certificate.",
      });
    }

    const certificate = await Certificate.findOneAndUpdate(
      { applicationId: application._id },
      {
        $setOnInsert: {
          applicationId: application._id,
          certificateNumber: application.internId.trim(),
          verificationCode: randomBytes(24).toString("hex"),
          fullName: application.fullName,
          internId: application.internId.trim(),
          collegeName: application.collegeName,
          subject: application.subject,
          subpart: application.subpart,
          issuedAt: new Date(),
          status: "valid",
        },
      },
      { upsert: true, new: true },
    ).lean();

    const verificationUrl = new URL(
      `/certificate/verify/${certificate.verificationCode}`,
      request.url,
    ).toString();

    if (certificate.status !== "valid") {
      return NextResponse.json({
        eligible: false,
        requirement: "certificate-valid",
        reason: "This certificate is not currently valid. Please contact the programme office.",
      });
    }

    return NextResponse.json({
      eligible: true,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        issuedAt: certificate.issuedAt.toISOString(),
        verificationUrl,
        status: certificate.status,
      },
    });
  } catch (error) {
    console.error("GET /api/student/certificate error:", error);
    return NextResponse.json({ error: "Failed to verify certificate eligibility." }, { status: 500 });
  }
}
