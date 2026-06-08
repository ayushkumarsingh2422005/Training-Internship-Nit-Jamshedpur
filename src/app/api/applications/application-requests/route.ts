import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/student-session";
import connectDB from "@/lib/mongodb";
import Application from "@/models/Application";
import StudentApplicationRequest from "@/models/StudentApplicationRequest";

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

    const items = await StudentApplicationRequest.find({ applicationId: application._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      items: items.map((item) => ({
        id: item._id.toString(),
        requestText: item.requestText,
        status: item.status,
        adminRemark: item.adminRemark ?? null,
        reviewedByEmail: item.reviewedByEmail ?? null,
        reviewedAt: item.reviewedAt?.toISOString() ?? null,
        createdAt: item.createdAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error("GET /api/applications/application-requests", error);
    return NextResponse.json({ error: "Failed to load requests." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    const body = (await request.json()) as { requestText?: string };
    const requestText = clean(body.requestText);
    if (!requestText || requestText.length < 15) {
      return NextResponse.json({ error: "Please write at least 15 characters in application text." }, { status: 400 });
    }

    await connectDB();
    const application = await Application.findOne({
      email: session.email,
      phoneNumber: session.phoneNumber,
    }).lean();
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const created = await StudentApplicationRequest.create({
      applicationId: application._id,
      internId: application.internId ?? null,
      fullName: application.fullName,
      email: application.email,
      subject: application.subject,
      subpart: application.subpart,
      requestText,
      status: "pending",
    });

    return NextResponse.json(
      {
        success: true,
        item: {
          id: created._id.toString(),
          requestText: created.requestText,
          status: created.status,
          adminRemark: created.adminRemark ?? null,
          reviewedByEmail: created.reviewedByEmail ?? null,
          reviewedAt: created.reviewedAt?.toISOString() ?? null,
          createdAt: created.createdAt?.toISOString() ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/applications/application-requests", error);
    return NextResponse.json({ error: "Failed to submit request." }, { status: 500 });
  }
}
