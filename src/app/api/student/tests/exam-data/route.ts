import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import TestQuestion from "@/models/TestQuestion";
import QuestionBank from "@/models/QuestionBank";
import StudentTestAccess from "@/models/StudentTestAccess";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentHash = searchParams.get("studentHash");
    const secureToken = searchParams.get("secureToken");

    if (!studentHash || !secureToken) {
      return NextResponse.json({ error: "Missing authentication parameters." }, { status: 400 });
    }

    await connectDB();

    // 1. Find Student Test Access
    const access = await StudentTestAccess.findOne({ studentHash, secureToken });
    if (!access) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    if (access.status === "Submitted" || access.status === "Terminated") {
      return NextResponse.json({ error: "This test has already been completed or terminated." }, { status: 403 });
    }

    // 2. Fetch Test
    const test = await Test.findById(access.testId).lean();
    if (!test || test.status !== "Published") {
      return NextResponse.json({ error: "Test is not active or available." }, { status: 404 });
    }

    const now = new Date();
    const start = new Date(test.startDateTime);
    const end = new Date(test.endDateTime);

    if (now < start || now > end) {
      return NextResponse.json({ error: "Test is outside the active time window." }, { status: 403 });
    }

    // 3. Update startedAt and status if starting for the first time
    if (!access.startedAt) {
      access.startedAt = now;
      access.status = "In Progress";
      await access.save();
    }

    // Calculate time left (seconds)
    const testDurationMs = test.durationMinutes * 60 * 1000;
    const individualEndTime = new Date(access.startedAt.getTime() + testDurationMs);
    
    // Test must end either when duration is over OR when the test window closes
    const finalEndTime = end < individualEndTime ? end : individualEndTime;
    const timeLeftSeconds = Math.max(0, Math.floor((finalEndTime.getTime() - Date.now()) / 1000));

    if (timeLeftSeconds <= 0) {
      access.status = "Submitted";
      access.submittedAt = now;
      await access.save();
      return NextResponse.json({ error: "Test duration has expired." }, { status: 403 });
    }

    // 4. Fetch questions linked to this test
    const testQuestions = await TestQuestion.find({ testId: test._id })
      .sort({ order: 1 })
      .lean();

    const questionIds = testQuestions.map((tq) => tq.questionId);
    const questionsFromBank = await QuestionBank.find({ _id: { $in: questionIds } }).lean();

    // Map questions with marks and sanitize options (remove isCorrect)
    const sanitizedQuestions = testQuestions.map((tq) => {
      const qBank = questionsFromBank.find((q) => q._id.toString() === tq.questionId.toString());
      if (!qBank) return null;

      // Strip correctness data to prevent inspection in browser
      const sanitizedOptions = (qBank.options || []).map((opt: any) => ({
        _id: opt._id,
        text: opt.text,
      }));

      return {
        _id: qBank._id,
        questionType: qBank.questionType,
        questionText: qBank.questionText,
        options: sanitizedOptions,
        marks: tq.marks,
        negativeMarks: tq.negativeMarks,
      };
    }).filter(Boolean);

    return NextResponse.json({
      test: {
        testName: test.testName,
        durationMinutes: test.durationMinutes,
        instructions: test.instructions || "",
        isNegativeMarking: test.isNegativeMarking,
      },
      questions: sanitizedQuestions,
      timeLeftSeconds,
    });
  } catch (error) {
    console.error("GET /api/student/tests/exam-data error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
