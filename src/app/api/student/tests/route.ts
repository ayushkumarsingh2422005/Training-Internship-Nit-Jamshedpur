import { NextResponse } from "next/server";
import { headers } from "next/headers";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import Application from "@/models/Application";
import { verifyStudentSessionToken } from "@/lib/student-session";

async function getStudent() {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.substring(7);
  const payload = await verifyStudentSessionToken(token);
  if (!payload) return null;

  await connectDB();
  return Application.findOne({ email: payload.email, phoneNumber: payload.phoneNumber }).lean();
}

export async function GET() {
  const student = await getStudent();
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Only tests that match the student's branch/subject and module/subpart
    const tests = await Test.find({
      subject: student.subject,
      subpart: student.subpart,
      status: "Published",
    }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ tests });
  } catch (error) {
    console.error("GET /api/student/tests", error);
    return NextResponse.json({ error: "Failed to load tests" }, { status: 500 });
  }
}
