import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import TestResult from "@/models/TestResult";
import StudentTestAccess from "@/models/StudentTestAccess";
import { getAdminSessionFromRequest } from "@/lib/admin-session";
import { getTestWithQuestions, updateTestWithQuestions } from "@/lib/test-exam-service";

export async function GET(req: Request) {
  const session = await getAdminSessionFromRequest(req, ["admin"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("id");

    if (testId) {
      const detail = await getTestWithQuestions(testId);
      if (!detail) {
        return NextResponse.json({ error: "Test not found." }, { status: 404 });
      }
      const teacher = await Test.findById(testId).populate("createdBy", "fullName email").lean();
      const createdBy = teacher?.createdBy as { fullName?: string; email?: string } | null;
      return NextResponse.json({
        ...detail,
        teacherName: createdBy?.fullName || "—",
        teacherEmail: createdBy?.email || "—",
      });
    }

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

export async function PUT(req: Request) {
  const session = await getAdminSessionFromRequest(req, ["admin"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await req.json();
    const { testId, ...payload } = body;
    if (!testId) {
      return NextResponse.json({ error: "Missing testId." }, { status: 400 });
    }

    const existing = await Test.findById(testId);
    if (!existing) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }

    const result = await updateTestWithQuestions(testId, payload, existing.createdBy);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, test: result.test });
  } catch (error) {
    console.error("PUT /api/admin/exams error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getAdminSessionFromRequest(req, ["admin"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { testId, status } = await req.json();
    if (!testId || !status) {
      return NextResponse.json({ error: "Missing testId or status." }, { status: 400 });
    }

    const test = await Test.findByIdAndUpdate(testId, { status }, { new: true });
    if (!test) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, test });
  } catch (error) {
    console.error("PATCH /api/admin/exams error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
