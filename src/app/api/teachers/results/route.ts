import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import TestResult from "@/models/TestResult";
import Application from "@/models/Application";
import Teacher from "@/models/Teacher";
import { verifyTeacherSessionToken } from "@/lib/teacher-session";

async function getTeacherFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);
  const payload = await verifyTeacherSessionToken(token);
  if (!payload) return null;

  await connectDB();
  return await Teacher.findOne({ email: payload.email, phoneNumber: payload.phoneNumber });
}

export async function GET(req: Request) {
  try {
    const teacher = await getTeacherFromRequest(req);
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Find all tests created by this teacher
    const tests = await Test.find({ createdBy: teacher._id }).select("_id testName").lean();
    const testIds = tests.map((t) => t._id);

    // 2. Find all results for those tests
    const results = await TestResult.find({ testId: { $in: testIds } })
      .populate({
        path: "studentId",
        model: Application,
        select: "fullName email internId subject subpart",
      })
      .populate({
        path: "testId",
        model: Test,
        select: "testName",
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("GET /api/teachers/results error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
