import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import TestQuestion from "@/models/TestQuestion";
import QuestionBank from "@/models/QuestionBank";
import StudentTestAccess from "@/models/StudentTestAccess";
import Application from "@/models/Application";
import TestResult from "@/models/TestResult";
import { shuffleArray } from "@/lib/exam-utils";
import { getExamTimeState } from "@/lib/exam-access";
import {
  finalizeAccessIfExpired,
  gradeAndSubmitAccess,
  verifyExamAccessOwner,
} from "@/lib/exam-grade-submit";

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

    const owner = await verifyExamAccessOwner(req, access.studentId);
    if (!owner.ok) {
      return NextResponse.json({ error: owner.error }, { status: owner.status });
    }

    const test = await Test.findById(access.testId).lean();
    if (!test || test.status !== "Published") {
      return NextResponse.json({ error: "Test is not active or available." }, { status: 404 });
    }

    const now = new Date();
    const timeState = getExamTimeState(test, access, now);

    if (timeState.windowNotStarted || timeState.windowClosed) {
      return NextResponse.json({ error: "Test is outside the active time window." }, { status: 403 });
    }

    if (access.status === "In Progress" && !access.startedAt) {
      access.status = "Not Started";
    }

    if (access.status === "Submitted" || access.status === "Terminated") {
      const existingResult = await TestResult.findOne({ accessId: access._id }).lean();
      const student = await Application.findById(access.studentId).lean();
      if (existingResult) {
        return NextResponse.json({
          expired: true,
          test: test
            ? {
                testName: test.testName,
                subject: test.subject,
                subpart: test.subpart,
              }
            : null,
          student: student
            ? { fullName: student.fullName, internId: student.internId ?? null }
            : null,
          result: {
            totalScore: existingResult.totalScore,
            correctQuestions: existingResult.correctQuestions,
            incorrectQuestions: existingResult.incorrectQuestions,
            unattemptedQuestions: existingResult.unattemptedQuestions,
            accuracyPercentage: existingResult.accuracyPercentage,
            autoSubmitted: true,
          },
        });
      }
      return NextResponse.json({ error: "This test has already been completed or terminated." }, { status: 403 });
    }

    const attemptStarted = Boolean(access.startedAt);

    if (attemptStarted && timeState.personalExpired) {
      try {
        const student = await Application.findById(access.studentId).lean();
        const result = await finalizeAccessIfExpired(access, test);
        const graded =
          result ?? (await gradeAndSubmitAccess(access, { autoExpired: true }));
        return NextResponse.json({
          expired: true,
          test: {
            testName: test.testName,
            subject: test.subject,
            subpart: test.subpart,
          },
          student: student
            ? { fullName: student.fullName, internId: student.internId ?? null }
            : null,
          result: graded,
        });
      } catch (err) {
        console.error("Auto-submit on exam-data failed:", err);
        return NextResponse.json({ error: "Test duration has expired." }, { status: 403 });
      }
    }

    const testQuestions = await TestQuestion.find({ testId: test._id })
      .sort({ order: 1 })
      .lean();

    const questionIds = testQuestions.map((tq) => tq.questionId.toString());

    if (!access.questionOrder || access.questionOrder.length === 0) {
      const orderedIds =
        test.randomizeQuestions !== false ? shuffleArray(questionIds) : questionIds;
      access.questionOrder = orderedIds;
    }

    await access.save();

    const orderMap = new Map(testQuestions.map((tq) => [tq.questionId.toString(), tq]));

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

    const student = await Application.findById(access.studentId).lean();
    if (!student) {
      return NextResponse.json({ error: "Student record not found." }, { status: 404 });
    }

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
        fullName: student.fullName,
        fatherName: student.fatherName,
        internId: student.internId ?? null,
        email: student.email,
        phoneNumber: student.phoneNumber,
        collegeName: student.collegeName,
        schoolName: student.schoolName,
        subject: student.subject,
        subpart: student.subpart,
        rollNumber: student.collegeRegistrationNumber ?? null,
      },
      questions: sanitizedQuestions,
      timeLeftSeconds: timeState.timeLeftSeconds,
      attemptStarted,
      currentQuestionIndex: access.currentQuestionIndex ?? 0,
      answersDraft,
      answersDraftUpdatedAt: access.updatedAt?.toISOString?.() ?? null,
      questionTimings: access.questionTimings ?? [],
      tabSwitches: access.tabSwitches ?? 0,
      focusLosses: access.focusLosses ?? 0,
    });
  } catch (error) {
    console.error("GET /api/student/tests/exam-data error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
