import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/student-session";
import connectDB from "@/lib/mongodb";
import Application from "@/models/Application";
import CourseFeedback from "@/models/CourseFeedback";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

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
    })
      .select({ _id: 1 })
      .lean();
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const items = await CourseFeedback.find({ applicationId: application._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      items: items.map((item) => ({
        id: item._id.toString(),
        message: item.message,
        createdAt: item.createdAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error("GET /api/applications/course-feedback", error);
    return NextResponse.json({ error: "Failed to load feedback history." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    const body = (await request.json()) as { message?: string };
    const message = clean(body.message);
    if (!message || message.length < 10) {
      return NextResponse.json({ error: "Please write at least 10 characters of feedback." }, { status: 400 });
    }

    await connectDB();
    const application = await Application.findOne({
      email: session.email,
      phoneNumber: session.phoneNumber,
    }).lean();
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const created = await CourseFeedback.create({
      applicationId: application._id,
      internId: application.internId ?? null,
      fullName: application.fullName,
      email: application.email,
      subject: application.subject,
      subpart: application.subpart,
      message,
    });

    return NextResponse.json(
      {
        success: true,
        item: {
          id: created._id.toString(),
          message: created.message,
          createdAt: created.createdAt?.toISOString() ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/applications/course-feedback", error);
    return NextResponse.json({ error: "Failed to submit feedback." }, { status: 500 });
  }
}
