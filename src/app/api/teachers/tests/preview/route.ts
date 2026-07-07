import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import TestQuestion from "@/models/TestQuestion";
import QuestionBank from "@/models/QuestionBank";
import Teacher from "@/models/Teacher";
import { verifyTeacherSessionToken } from "@/lib/teacher-session";
import { shuffleArray } from "@/lib/exam-utils";
import type { GradingQuestion } from "@/lib/exam-preview-score";

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

    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("id");
    if (!testId) {
      return NextResponse.json({ error: "Missing test id." }, { status: 400 });
    }

    const test = await Test.findOne({ _id: testId, createdBy: teacher._id }).lean();
    if (!test) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }

    const testQuestions = await TestQuestion.find({ testId: test._id })
      .sort({ order: 1 })
      .lean();

    const questionIds = testQuestions.map((tq) => tq.questionId.toString());
    const orderedIds =
      test.randomizeQuestions !== false ? shuffleArray(questionIds) : questionIds;

    const orderMap = new Map(testQuestions.map((tq) => [tq.questionId.toString(), tq]));
    const questionsFromBank = await QuestionBank.find({
      _id: { $in: testQuestions.map((tq) => tq.questionId) },
    }).lean();

    const displayQuestions: Record<string, unknown>[] = [];
    const gradingQuestions: GradingQuestion[] = [];

    for (const qId of orderedIds) {
      const tq = orderMap.get(qId);
      const qBank = questionsFromBank.find((q) => q._id.toString() === qId);
      if (!tq || !qBank) continue;

      const sanitizedOptions = (qBank.options || []).map(
        (opt: { _id: unknown; text: string; isCorrect?: boolean }) => ({
          _id: opt._id,
          text: opt.text,
        }),
      );

      displayQuestions.push({
        _id: qBank._id,
        questionType: qBank.questionType,
        questionText: qBank.questionText,
        options: sanitizedOptions,
        marks: tq.marks,
        negativeMarks: tq.negativeMarks,
        timeLimitSeconds: tq.timeLimitSeconds ?? 0,
      });

      gradingQuestions.push({
        _id: qBank._id.toString(),
        questionType: qBank.questionType,
        options: (qBank.options || []).map(
          (opt: { _id: unknown; isCorrect?: boolean }) => ({
            _id: String(opt._id),
            isCorrect: opt.isCorrect,
          }),
        ),
        correctIntegerAnswer: qBank.correctIntegerAnswer ?? null,
        marks: tq.marks,
        negativeMarks: tq.negativeMarks,
      });
    }

    if (displayQuestions.length === 0) {
      return NextResponse.json({ error: "This test has no questions to preview." }, { status: 400 });
    }

    const timeLeftSeconds = test.durationMinutes * 60;

    return NextResponse.json({
      test: {
        _id: test._id,
        testName: test.testName,
        subject: test.subject,
        subpart: test.subpart,
        durationMinutes: test.durationMinutes,
        instructions: test.instructions || "",
        totalMarks: test.totalMarks,
        isNegativeMarking: test.isNegativeMarking,
        randomizeQuestions: test.randomizeQuestions !== false,
      },
      student: {
        fullName: `${teacher.fullName} (Teacher Preview)`,
        fatherName: "—",
        internId: "PREVIEW",
        email: teacher.email,
        phoneNumber: teacher.phoneNumber,
        collegeName: "Preview session — not a live candidate",
        schoolName: "—",
        subject: test.subject,
        subpart: test.subpart,
        rollNumber: null,
      },
      questions: displayQuestions,
      gradingQuestions,
      timeLeftSeconds,
      currentQuestionIndex: 0,
      answersDraft: {},
      questionTimings: [],
    });
  } catch (error) {
    console.error("GET /api/teachers/tests/preview error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
