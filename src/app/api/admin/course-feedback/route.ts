import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-session";
import connectDB from "@/lib/mongodb";
import CourseFeedback from "@/models/CourseFeedback";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request, ["admin"]))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const items = await CourseFeedback.find({}).sort({ createdAt: -1 }).limit(500).lean();

    return NextResponse.json({
      items: items.map((item) => ({
        id: item._id.toString(),
        internId: item.internId ?? null,
        fullName: item.fullName,
        email: item.email,
        subject: item.subject,
        subpart: item.subpart,
        message: item.message,
        createdAt: item.createdAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/course-feedback", error);
    return NextResponse.json({ error: "Failed to load feedback." }, { status: 500 });
  }
}
