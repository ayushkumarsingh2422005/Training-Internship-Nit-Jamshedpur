import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import TestQuestion from "@/models/TestQuestion";
import QuestionBank from "@/models/QuestionBank";
import StudentTestAccess from "@/models/StudentTestAccess";
import StudentAnswer from "@/models/StudentAnswer";
import TestResult from "@/models/TestResult";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentHash, secureToken, answers: clientAnswers } = body;

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
      return NextResponse.json({ error: "Test has already been submitted." }, { status: 400 });
    }

    // 2. Fetch Test
    const test = await Test.findById(access.testId).lean();
    if (!test) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }

    const now = new Date();
    const end = new Date(test.endDateTime);
    if (now > end) {
      access.status = "Terminated";
      await access.save();
      return NextResponse.json({ error: "Submission blocked: The test time window has already closed." }, { status: 403 });
    }

    // Merge client answers with server-side draft (prefer client when both exist)
    const serverDraft =
      access.answersDraft && typeof access.answersDraft === "object"
        ? (access.answersDraft as Record<string, unknown>)
        : {};
    const answers = { ...serverDraft, ...(clientAnswers || {}) };
    const testQuestions = await TestQuestion.find({ testId: test._id }).lean();
    const questionIds = testQuestions.map((tq) => tq.questionId);
    const questionsFromBank = await QuestionBank.find({ _id: { $in: questionIds } }).lean();

    let totalScore = 0;
    let correctQuestions = 0;
    let incorrectQuestions = 0;
    let unattemptedQuestions = 0;

    const submissionTime = new Date();
    const totalTimeSpentSeconds = access.startedAt
      ? Math.floor((submissionTime.getTime() - new Date(access.startedAt).getTime()) / 1000)
      : 0;

    // Loop through questions and grade them
    for (const tq of testQuestions) {
      const qBank = questionsFromBank.find((q) => q._id.toString() === tq.questionId.toString());
      if (!qBank) continue;

      const studentAns = answers ? answers[qBank._id.toString()] : undefined;
      let isCorrect = false;
      let isAttempted = false;

      let selectedOptionIds: string[] = [];
      let integerAnswer: number | null = null;

      if (qBank.questionType === "Single Correct") {
        if (studentAns !== undefined && studentAns !== "") {
          isAttempted = true;
          selectedOptionIds = [studentAns];
          const correctOption = qBank.options.find((opt: any) => opt.isCorrect);
          if (correctOption && correctOption._id.toString() === studentAns) {
            isCorrect = true;
          }
        }
      } else if (qBank.questionType === "Multiple Correct") {
        if (Array.isArray(studentAns) && studentAns.length > 0) {
          isAttempted = true;
          selectedOptionIds = studentAns;

          const correctOptionIds = qBank.options
            .filter((opt: any) => opt.isCorrect)
            .map((opt: any) => opt._id.toString());

          // Match exactly: same size and every student selection is correct, and every correct option is selected
          const matchesAll =
            correctOptionIds.length === studentAns.length &&
            studentAns.every((id: string) => correctOptionIds.includes(id));

          if (matchesAll) {
            isCorrect = true;
          }
        }
      } else if (qBank.questionType === "Integer Type") {
        if (studentAns !== undefined && studentAns !== null && studentAns !== "") {
          isAttempted = true;
          integerAnswer = Number(studentAns);
          if (qBank.correctIntegerAnswer === integerAnswer) {
            isCorrect = true;
          }
        }
      }

      // Save StudentAnswer
      await StudentAnswer.findOneAndUpdate(
        { accessId: access._id, questionId: qBank._id },
        {
          testId: test._id,
          studentId: access.studentId,
          selectedOptionIds,
          integerAnswer,
          status: isAttempted ? "Answered" : "Not Answered",
          timeSpentSeconds: (access.questionTimings ?? []).find(
            (t: { questionId: string }) => t.questionId === qBank._id.toString(),
          )?.elapsedSeconds ?? 0,
        },
        { upsert: true, new: true }
      );

      // Score calculation
      if (!isAttempted) {
        unattemptedQuestions++;
      } else if (isCorrect) {
        correctQuestions++;
        totalScore += tq.marks;
      } else {
        incorrectQuestions++;
        if (test.isNegativeMarking) {
          totalScore -= tq.negativeMarks;
        }
      }
    }

    const attemptedCount = correctQuestions + incorrectQuestions;
    const accuracyPercentage = attemptedCount > 0 ? Math.round((correctQuestions / attemptedCount) * 100) : 0;

    // 4. Save TestResult
    await TestResult.findOneAndUpdate(
      { accessId: access._id },
      {
        testId: test._id,
        studentId: access.studentId,
        totalScore,
        correctQuestions,
        incorrectQuestions,
        unattemptedQuestions,
        accuracyPercentage,
        totalTimeSpentSeconds,
      },
      { upsert: true }
    );

    // 5. Update StudentTestAccess
    access.status = "Submitted";
    access.submittedAt = submissionTime;
    await access.save();

    return NextResponse.json({
      success: true,
      result: {
        totalScore,
        correctQuestions,
        incorrectQuestions,
        unattemptedQuestions,
        accuracyPercentage,
      },
    });
  } catch (error) {
    console.error("POST /api/student/tests/submit error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
