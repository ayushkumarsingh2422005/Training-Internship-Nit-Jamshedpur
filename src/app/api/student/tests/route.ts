import { NextResponse } from "next/server";
import { headers } from "next/headers";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import Application from "@/models/Application";
import StudentTestAccess from "@/models/StudentTestAccess";
import TestResult from "@/models/TestResult";
import { verifyStudentSessionToken } from "@/lib/student-session";
import { enrichStudentTest } from "@/lib/student-test-status";
import { moduleQueryFilter } from "@/lib/module-match";

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
    const tests = await Test.find({
      ...moduleQueryFilter(student.subject, student.subpart),
      status: "Published",
    })
      .sort({ startDateTime: -1 })
      .lean();

    if (tests.length === 0) {
      return NextResponse.json({ tests: [] });
    }

    const testIds = tests.map((t) => t._id);

    const [accessRecords, resultRecords] = await Promise.all([
      StudentTestAccess.find({ studentId: student._id, testId: { $in: testIds } }).lean(),
      TestResult.find({ studentId: student._id, testId: { $in: testIds } }).lean(),
    ]);

    const accessByTestId = new Map(
      accessRecords.map((a) => [a.testId.toString(), a]),
    );
    const resultByTestId = new Map(
      resultRecords.map((r) => [r.testId.toString(), r]),
    );

    const now = new Date();
    const enriched = tests.map((test) =>
      enrichStudentTest(
        test,
        accessByTestId.get(test._id.toString()),
        resultByTestId.get(test._id.toString()),
        now,
      ),
    );

    return NextResponse.json({ tests: enriched });
  } catch (error) {
    console.error("GET /api/student/tests", error);
    return NextResponse.json({ error: "Failed to load tests" }, { status: 500 });
  }
}
