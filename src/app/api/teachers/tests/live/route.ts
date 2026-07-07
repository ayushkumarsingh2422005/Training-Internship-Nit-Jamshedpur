import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import Teacher from "@/models/Teacher";
import Application from "@/models/Application";
import StudentTestAccess from "@/models/StudentTestAccess";
import { verifyTeacherSessionToken } from "@/lib/teacher-session";
import { getExamTimeState } from "@/lib/exam-access";
import { isProctorFlagged } from "@/lib/exam-utils";

async function getTeacherFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);
  const payload = await verifyTeacherSessionToken(token);
  if (!payload) return null;

  await connectDB();
  return Teacher.findOne({ email: payload.email, phoneNumber: payload.phoneNumber });
}

export async function GET(req: Request) {
  try {
    const teacher = await getTeacherFromRequest(req);
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("testId");
    if (!testId) {
      return NextResponse.json({ error: "Missing testId." }, { status: 400 });
    }

    const test = await Test.findOne({ _id: testId, createdBy: teacher._id }).lean();
    if (!test) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }

    const accesses = await StudentTestAccess.find({
      testId: test._id,
      status: "In Progress",
    }).lean();

    const studentIds = accesses.map((a) => a.studentId);
    const students = await Application.find({ _id: { $in: studentIds } }).lean();
    const studentMap = new Map(students.map((s) => [s._id.toString(), s]));

    const now = new Date();
    const attempts = accesses.map((access) => {
      const student = studentMap.get(access.studentId.toString());
      const timeState = getExamTimeState(test, access, now);
      const tabSwitches = access.tabSwitches ?? 0;
      const focusLosses = access.focusLosses ?? 0;
      return {
        accessId: access._id,
        studentName: student?.fullName ?? "—",
        internId: student?.internId ?? "—",
        email: student?.email ?? "—",
        startedAt: access.startedAt,
        timeLeftSeconds: timeState.timeLeftSeconds,
        tabSwitches,
        focusLosses,
        proctorFlagged: isProctorFlagged(tabSwitches, focusLosses),
        currentQuestionIndex: access.currentQuestionIndex ?? 0,
      };
    });

    attempts.sort((a, b) => b.tabSwitches + b.focusLosses - (a.tabSwitches + a.focusLosses));

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("GET /api/teachers/tests/live error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
