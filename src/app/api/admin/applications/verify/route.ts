import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-session";
import connectDB from "@/lib/mongodb";
import Application from "@/models/Application";

type VerifyPayload = {
  id?: string;
  verified?: boolean;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as VerifyPayload;
    const id = clean(body.id);
    if (!id) {
      return NextResponse.json({ error: "Application id is required." }, { status: 400 });
    }

    const verified = body.verified === true;

    await connectDB();
    const updated = await Application.findByIdAndUpdate(
      id,
      {
        $set: {
          isVerifiedByAdmin: verified,
          verifiedByAdminAt: verified ? new Date() : null,
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      verified,
      verifiedAt: updated.verifiedByAdminAt ?? null,
    });
  } catch (error) {
    console.error("POST /api/admin/applications/verify", error);
    return NextResponse.json({ error: "Failed to update verification status." }, { status: 500 });
  }
}
