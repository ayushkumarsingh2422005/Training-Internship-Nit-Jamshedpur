import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import Teacher from "@/models/Teacher";
import Application from "@/models/Application";
import StudentTestAccess from "@/models/StudentTestAccess";
import TestResult from "@/models/TestResult";
import StudentAnswer from "@/models/StudentAnswer";
import TestQuestion from "@/models/TestQuestion";
import QuestionBank from "@/models/QuestionBank";
import { verifyTeacherSessionToken } from "@/lib/teacher-session";

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
    const resultId = searchParams.get("resultId");
    if (!resultId) {
      return NextResponse.json({ error: "Missing resultId." }, { status: 400 });
    }

    const result = await TestResult.findById(resultId).lean();
    if (!result) {
      return NextResponse.json({ error: "Result not found." }, { status: 404 });
    }

    const test = await Test.findOne({ _id: result.testId, createdBy: teacher._id }).lean();
    if (!test) {
      return NextResponse.json({ error: "Result not found." }, { status: 404 });
    }

    const access = await StudentTestAccess.findById(result.accessId).lean();
    const student = await Application.findById(result.studentId).lean();
    if (!access || !student) {
      return NextResponse.json({ error: "Submission record incomplete." }, { status: 404 });
    }

    const studentAnswers = await StudentAnswer.find({ accessId: access._id }).lean();
    const testQuestions = await TestQuestion.find({ testId: test._id }).sort({ order: 1 }).lean();
    const questionsFromBank = await QuestionBank.find({
      _id: { $in: testQuestions.map((tq) => tq.questionId) },
    }).lean();

    const orderMap = new Map(testQuestions.map((tq) => [tq.questionId.toString(), tq]));
    const questionOrder =
      access.questionOrder && access.questionOrder.length > 0
        ? (access.questionOrder as string[])
        : testQuestions.map((tq) => tq.questionId.toString());

    const detailedQuestions = questionOrder
      .map((qId) => {
        const tq = orderMap.get(qId);
        const qBank = questionsFromBank.find((q) => q._id.toString() === qId);
        if (!tq || !qBank) return null;

        const studentAns = studentAnswers.find(
          (sa) => sa.questionId.toString() === qBank._id.toString(),
        );
        const selectedOptionIds = studentAns?.selectedOptionIds || [];
        const integerAnswer = studentAns?.integerAnswer ?? null;

        let isCorrect = false;
        let isAttempted = false;

        if (qBank.questionType === "Single Correct") {
          if (selectedOptionIds.length > 0) {
            isAttempted = true;
            const correctOption = qBank.options.find((opt: { isCorrect?: boolean }) => opt.isCorrect);
            if (correctOption && correctOption._id.toString() === selectedOptionIds[0].toString()) {
              isCorrect = true;
            }
          }
        } else if (qBank.questionType === "Multiple Correct") {
          if (selectedOptionIds.length > 0) {
            isAttempted = true;
            const correctOptionIds = qBank.options
              .filter((opt: { isCorrect?: boolean }) => opt.isCorrect)
              .map((opt: { _id: unknown }) => String(opt._id));
            isCorrect =
              correctOptionIds.length === selectedOptionIds.length &&
              selectedOptionIds.every((id) => correctOptionIds.includes(id.toString()));
          }
        } else if (qBank.questionType === "Integer Type") {
          if (integerAnswer !== null) {
            isAttempted = true;
            if (qBank.correctIntegerAnswer === integerAnswer) isCorrect = true;
          }
        }

        return {
          _id: qBank._id,
          questionType: qBank.questionType,
          questionText: qBank.questionText,
          options: qBank.options,
          correctIntegerAnswer: qBank.correctIntegerAnswer,
          explanation: qBank.explanation,
          marks: tq.marks,
          negativeMarks: tq.negativeMarks,
          studentSelection: {
            selectedOptionIds,
            integerAnswer,
            isAttempted,
            isCorrect,
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      test: {
        testName: test.testName,
        subject: test.subject,
        subpart: test.subpart,
        totalMarks: test.totalMarks,
        isNegativeMarking: test.isNegativeMarking,
      },
      student: {
        fullName: student.fullName,
        internId: student.internId,
        email: student.email,
        collegeName: student.collegeName,
      },
      result: {
        totalScore: result.totalScore,
        correctQuestions: result.correctQuestions,
        incorrectQuestions: result.incorrectQuestions,
        unattemptedQuestions: result.unattemptedQuestions,
        accuracyPercentage: result.accuracyPercentage,
        totalTimeSpentSeconds: result.totalTimeSpentSeconds,
      },
      proctoring: {
        tabSwitches: access.tabSwitches ?? 0,
        focusLosses: access.focusLosses ?? 0,
        startedAt: access.startedAt,
        submittedAt: access.submittedAt,
      },
      questions: detailedQuestions,
    });
  } catch (error) {
    console.error("GET /api/teachers/results/detail error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
