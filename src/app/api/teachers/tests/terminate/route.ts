import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Teacher from "@/models/Teacher";
import { verifyTeacherSessionToken } from "@/lib/teacher-session";
import { terminateExamAccess } from "@/lib/exam-terminate";

async function getTeacherFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);
  const payload = await verifyTeacherSessionToken(token);
  if (!payload) return null;

  await connectDB();
  return Teacher.findOne({ email: payload.email, phoneNumber: payload.phoneNumber });
}

export async function POST(req: Request) {
  try {
    const teacher = await getTeacherFromRequest(req);
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const accessId = body?.accessId as string | undefined;
    if (!accessId) {
      return NextResponse.json({ error: "Missing accessId." }, { status: 400 });
    }

    const result = await terminateExamAccess(accessId, teacher._id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, alreadyTerminated: result.alreadyTerminated ?? false });
  } catch (error) {
    console.error("POST /api/teachers/tests/terminate error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
