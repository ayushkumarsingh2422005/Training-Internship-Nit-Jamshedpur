import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-session";
import connectDB from "@/lib/mongodb";
import StudentApplicationRequest, { REQUEST_STATUSES } from "@/models/StudentApplicationRequest";

export const dynamic = "force-dynamic";

type UpdatePayload = {
  id?: string;
  status?: string;
  adminRemark?: string;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidStatus(value: string): value is (typeof REQUEST_STATUSES)[number] {
  return (REQUEST_STATUSES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request, ["admin"]))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const items = await StudentApplicationRequest.find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    return NextResponse.json({
      items: items.map((item) => ({
        id: item._id.toString(),
        internId: item.internId ?? null,
        fullName: item.fullName,
        email: item.email,
        subject: item.subject,
        subpart: item.subpart,
        requestText: item.requestText,
        status: item.status,
        adminRemark: item.adminRemark ?? null,
        reviewedByEmail: item.reviewedByEmail ?? null,
        reviewedAt: item.reviewedAt?.toISOString() ?? null,
        createdAt: item.createdAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/application-requests", error);
    return NextResponse.json({ error: "Failed to load requests." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getAdminSessionFromRequest(request, ["admin"]);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as UpdatePayload;
    const id = clean(body.id);
    const status = clean(body.status).toLowerCase();
    const adminRemark = clean(body.adminRemark);

    if (!id) {
      return NextResponse.json({ error: "Request id is required." }, { status: 400 });
    }
    if (!isValidStatus(status) || status === "pending") {
      return NextResponse.json({ error: "Status must be approved or rejected." }, { status: 400 });
    }

    await connectDB();
    const updated = await StudentApplicationRequest.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          adminRemark: adminRemark || null,
          reviewedByEmail: session.email,
          reviewedAt: new Date(),
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      item: {
        id: updated._id.toString(),
        status: updated.status,
        adminRemark: updated.adminRemark ?? null,
        reviewedByEmail: updated.reviewedByEmail ?? null,
        reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("PATCH /api/admin/application-requests", error);
    return NextResponse.json({ error: "Failed to update request status." }, { status: 500 });
  }
}
