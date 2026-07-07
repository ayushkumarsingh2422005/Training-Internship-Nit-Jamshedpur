import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import TestResult from "@/models/TestResult";
import StudentTestAccess from "@/models/StudentTestAccess";
import { getAdminSessionFromRequest } from "@/lib/admin-session";

export async function GET(req: Request) {
  const session = await getAdminSessionFromRequest(req, ["admin"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const tests = await Test.find({})
      .populate("createdBy", "fullName email")
      .sort({ startDateTime: -1 })
      .lean();

    const testIds = tests.map((t) => t._id);

    const [submissionCounts, inProgressCounts] = await Promise.all([
      TestResult.aggregate([
        { $match: { testId: { $in: testIds } } },
        { $group: { _id: "$testId", count: { $sum: 1 } } },
      ]),
      StudentTestAccess.aggregate([
        {
          $match: {
            testId: { $in: testIds },
            status: "In Progress",
          },
        },
        { $group: { _id: "$testId", count: { $sum: 1 } } },
      ]),
    ]);

    const submittedMap = new Map(
      submissionCounts.map((r: { _id: unknown; count: number }) => [String(r._id), r.count]),
    );
    const inProgressMap = new Map(
      inProgressCounts.map((r: { _id: unknown; count: number }) => [String(r._id), r.count]),
    );

    const proctorTotals = await StudentTestAccess.aggregate([
      { $match: { testId: { $in: testIds }, status: { $in: ["In Progress", "Submitted"] } } },
      {
        $group: {
          _id: null,
          tabSwitches: { $sum: "$tabSwitches" },
          focusLosses: { $sum: "$focusLosses" },
        },
      },
    ]);

    const overview = tests.map((test) => {
      const teacher = test.createdBy as { fullName?: string; email?: string } | null;
      const id = test._id.toString();
      return {
        _id: test._id,
        testName: test.testName,
        subject: test.subject,
        subpart: test.subpart,
        status: test.status,
        startDateTime: test.startDateTime,
        endDateTime: test.endDateTime,
        durationMinutes: test.durationMinutes,
        totalMarks: test.totalMarks,
        teacherName: teacher?.fullName || "—",
        teacherEmail: teacher?.email || "—",
        submissions: submittedMap.get(id) ?? 0,
        inProgress: inProgressMap.get(id) ?? 0,
      };
    });

    const stats = {
      totalTests: tests.length,
      publishedTests: tests.filter((t) => t.status === "Published").length,
      totalSubmissions: submissionCounts.reduce(
        (sum: number, r: { count: number }) => sum + r.count,
        0,
      ),
      inProgressAttempts: inProgressCounts.reduce(
        (sum: number, r: { count: number }) => sum + r.count,
        0,
      ),
      totalTabSwitches: proctorTotals[0]?.tabSwitches ?? 0,
      totalFocusLosses: proctorTotals[0]?.focusLosses ?? 0,
    };

    return NextResponse.json({ tests: overview, stats });
  } catch (error) {
    console.error("GET /api/admin/exams error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
