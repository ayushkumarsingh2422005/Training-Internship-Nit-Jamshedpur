import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import Application from "@/models/Application";
import StudentTestAccess from "@/models/StudentTestAccess";
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

export async function POST(request: Request) {
  const student = await getStudent();
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { testId } = await request.json();
    if (!testId) return NextResponse.json({ error: "Test ID required" }, { status: 400 });

    const test = await Test.findById(testId).lean();
    if (!test || test.status !== "Published") {
      return NextResponse.json({ error: "Test not available" }, { status: 404 });
    }

    if (test.subject !== student.subject || test.subpart !== student.subpart) {
      return NextResponse.json({ error: "You are not enrolled in this test's module" }, { status: 403 });
    }

    const now = new Date();
    if (now < new Date(test.startDateTime) || now > new Date(test.endDateTime)) {
      return NextResponse.json({ error: "Test is not currently active" }, { status: 403 });
    }

    // Check if access already exists
    let access = await StudentTestAccess.findOne({ testId: test._id, studentId: student._id });

    if (!access) {
      // Create new access tokens
      const studentHash = crypto.createHash("sha256").update(`${student._id}-${test._id}`).digest("hex");
      const secureToken = crypto.randomBytes(32).toString("hex");
      
      access = await StudentTestAccess.create({
        testId: test._id,
        studentId: student._id,
        studentHash,
        secureToken,
        status: "Not Started",
      });
    } else if (access.status === "Submitted" || access.status === "Terminated") {
      return NextResponse.json({ error: "You have already submitted this test." }, { status: 403 });
    }

    return NextResponse.json({
      studentHash: access.studentHash,
      secureToken: access.secureToken
    });

  } catch (error) {
    console.error("POST /api/student/tests/access", error);
    return NextResponse.json({ error: "Failed to create test access" }, { status: 500 });
  }
}
