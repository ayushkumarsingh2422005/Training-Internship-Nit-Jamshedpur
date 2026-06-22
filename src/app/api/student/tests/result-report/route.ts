import { NextResponse } from "next/server";
import { headers } from "next/headers";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import Teacher from "@/models/Teacher";
import Application from "@/models/Application";
import StudentTestAccess from "@/models/StudentTestAccess";
import TestResult from "@/models/TestResult";
import StudentAnswer from "@/models/StudentAnswer";
import TestQuestion from "@/models/TestQuestion";
import QuestionBank from "@/models/QuestionBank";
import { verifyStudentSessionToken } from "@/lib/student-session";

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

export async function GET(req: Request) {
  const student = await getStudent();
  if (!student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("testId");

    if (!testId) {
      return NextResponse.json({ error: "Missing testId parameter." }, { status: 400 });
    }

    await connectDB();

    // Ensure Teacher model is registered (prevents Next.js HMR tree-shaking from omitting model)
    const _teacherModel = Teacher.modelName;

    // 1. Fetch Test & Populate Teacher
    const test = await Test.findById(testId).populate("createdBy", "fullName").lean() as any;
    if (!test) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }

    // Ensure the test window has closed
    const now = new Date();
    const end = new Date(test.endDateTime);
    if (now <= end) {
      return NextResponse.json(
        { error: "Result details are only available after the test window has closed." },
        { status: 403 }
      );
    }

    // 2. Fetch Student Access
    const access = await StudentTestAccess.findOne({ studentId: student._id, testId }).lean();
    if (!access) {
      return NextResponse.json({ error: "No access record found for this test." }, { status: 404 });
    }

    // 3. Fetch TestResult
    const result = await TestResult.findOne({ accessId: access._id }).lean();
    if (!result) {
      return NextResponse.json({ error: "No results submitted for this test." }, { status: 404 });
    }

    // 4. Fetch Student Answers
    const studentAnswers = await StudentAnswer.find({ accessId: access._id }).lean();

    // 5. Fetch Questions
    const testQuestions = await TestQuestion.find({ testId: test._id }).sort({ order: 1 }).lean();
    const questionIds = testQuestions.map((tq) => tq.questionId);
    const questionsFromBank = await QuestionBank.find({ _id: { $in: questionIds } }).lean();

    // Map questions with correct option/answer and student's selections
    const detailedQuestions = testQuestions.map((tq) => {
      const qBank = questionsFromBank.find((q) => q._id.toString() === tq.questionId.toString());
      if (!qBank) return null;

      const studentAns = studentAnswers.find((sa) => sa.questionId.toString() === qBank._id.toString());
      const selectedOptionIds = studentAns?.selectedOptionIds || [];
      const integerAnswer = studentAns?.integerAnswer ?? null;

      // Grade status for this question
      let isCorrect = false;
      let isAttempted = false;

      if (qBank.questionType === "Single Correct") {
        if (selectedOptionIds.length > 0) {
          isAttempted = true;
          const correctOption = qBank.options.find((opt: any) => opt.isCorrect);
          if (correctOption && correctOption._id.toString() === selectedOptionIds[0].toString()) {
            isCorrect = true;
          }
        }
      } else if (qBank.questionType === "Multiple Correct") {
        if (selectedOptionIds.length > 0) {
          isAttempted = true;
          const correctOptionIds = qBank.options
            .filter((opt: any) => opt.isCorrect)
            .map((opt: any) => opt._id.toString());

          isCorrect =
            correctOptionIds.length === selectedOptionIds.length &&
            selectedOptionIds.every((id: any) => correctOptionIds.includes(id.toString()));
        }
      } else if (qBank.questionType === "Integer Type") {
        if (integerAnswer !== null) {
          isAttempted = true;
          if (qBank.correctIntegerAnswer === integerAnswer) {
            isCorrect = true;
          }
        }
      }

      return {
        _id: qBank._id,
        questionType: qBank.questionType,
        questionText: qBank.questionText,
        options: qBank.options, // Contains correct indicators
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
    }).filter(Boolean);

    return NextResponse.json({
      test: {
        testName: test.testName,
        subject: test.subject,
        subpart: test.subpart,
        durationMinutes: test.durationMinutes,
        totalMarks: test.totalMarks,
        isNegativeMarking: test.isNegativeMarking,
        teacherName: test.createdBy?.fullName || "Assigned Instructor",
      },
      student: {
        fullName: student.fullName,
        internId: student.internId,
        collegeName: student.collegeName,
        email: student.email,
      },
      result: {
        totalScore: result.totalScore,
        correctQuestions: result.correctQuestions,
        incorrectQuestions: result.incorrectQuestions,
        unattemptedQuestions: result.unattemptedQuestions,
        accuracyPercentage: result.accuracyPercentage,
        totalTimeSpentSeconds: result.totalTimeSpentSeconds,
      },
      questions: detailedQuestions,
    });
  } catch (error) {
    console.error("GET /api/student/tests/result-report error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
