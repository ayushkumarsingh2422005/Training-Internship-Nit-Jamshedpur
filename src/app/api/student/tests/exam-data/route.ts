import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import TestQuestion from "@/models/TestQuestion";
import QuestionBank from "@/models/QuestionBank";
import StudentTestAccess from "@/models/StudentTestAccess";
import { shuffleArray } from "@/lib/exam-utils";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentHash = searchParams.get("studentHash");
    const secureToken = searchParams.get("secureToken");

    if (!studentHash || !secureToken) {
      return NextResponse.json({ error: "Missing authentication parameters." }, { status: 400 });
    }

    await connectDB();

    const access = await StudentTestAccess.findOne({ studentHash, secureToken });
    if (!access) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    if (access.status === "Submitted" || access.status === "Terminated") {
      return NextResponse.json({ error: "This test has already been completed or terminated." }, { status: 403 });
    }

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

    if (!access.startedAt) {
      access.startedAt = now;
      access.status = "In Progress";
    }

    const testDurationMs = test.durationMinutes * 60 * 1000;
    const individualEndTime = new Date(access.startedAt!.getTime() + testDurationMs);
    const finalEndTime = end < individualEndTime ? end : individualEndTime;
    const timeLeftSeconds = Math.max(0, Math.floor((finalEndTime.getTime() - Date.now()) / 1000));

    if (timeLeftSeconds <= 0) {
      access.status = "Submitted";
      access.submittedAt = now;
      await access.save();
      return NextResponse.json({ error: "Test duration has expired." }, { status: 403 });
    }

    const testQuestions = await TestQuestion.find({ testId: test._id })
      .sort({ order: 1 })
      .lean();

    const questionIds = testQuestions.map((tq) => tq.questionId.toString());

    if (!access.questionOrder || access.questionOrder.length === 0) {
      const orderedIds = test.randomizeQuestions !== false
        ? shuffleArray(questionIds)
        : questionIds;
      access.questionOrder = orderedIds;
    }

    await access.save();

    const orderMap = new Map(
      testQuestions.map((tq) => [tq.questionId.toString(), tq]),
    );

    const questionsFromBank = await QuestionBank.find({
      _id: { $in: testQuestions.map((tq) => tq.questionId) },
    }).lean();

    const sanitizedQuestions = (access.questionOrder as string[])
      .map((qId) => {
        const tq = orderMap.get(qId);
        const qBank = questionsFromBank.find((q) => q._id.toString() === qId);
        if (!tq || !qBank) return null;

        const sanitizedOptions = (qBank.options || []).map((opt: { _id: unknown; text: string }) => ({
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
          timeLimitSeconds: tq.timeLimitSeconds ?? 0,
        };
      })
      .filter(Boolean);

    const answersDraft =
      access.answersDraft && typeof access.answersDraft === "object"
        ? access.answersDraft
        : {};

    return NextResponse.json({
      test: {
        _id: test._id,
        testName: test.testName,
        durationMinutes: test.durationMinutes,
        instructions: test.instructions || "",
        isNegativeMarking: test.isNegativeMarking,
        randomizeQuestions: test.randomizeQuestions !== false,
      },
      questions: sanitizedQuestions,
      timeLeftSeconds,
      currentQuestionIndex: access.currentQuestionIndex ?? 0,
      answersDraft,
      questionTimings: access.questionTimings ?? [],
      tabSwitches: access.tabSwitches ?? 0,
      focusLosses: access.focusLosses ?? 0,
    });
  } catch (error) {
    console.error("GET /api/student/tests/exam-data error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
