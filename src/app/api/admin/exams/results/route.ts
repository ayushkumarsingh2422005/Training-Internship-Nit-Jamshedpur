import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import TestResult from "@/models/TestResult";
import Application from "@/models/Application";
import StudentTestAccess from "@/models/StudentTestAccess";
import { getAdminSessionFromRequest } from "@/lib/admin-session";

export async function GET(req: Request) {
  const session = await getAdminSessionFromRequest(req, ["admin"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("testId");
    if (!testId) {
      return NextResponse.json({ error: "Missing testId." }, { status: 400 });
    }

    const test = await Test.findById(testId).lean();
    if (!test) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }

    const results = await TestResult.find({ testId: test._id })
      .populate({
        path: "studentId",
        model: Application,
        select: "fullName email internId subject subpart branch",
      })
      .populate({
        path: "accessId",
        model: StudentTestAccess,
        select: "tabSwitches focusLosses startedAt submittedAt",
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ results, testName: test.testName });
  } catch (error) {
    console.error("GET /api/admin/exams/results error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
