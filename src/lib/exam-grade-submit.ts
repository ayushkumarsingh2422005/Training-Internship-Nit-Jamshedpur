import connectDB from "@/lib/mongodb";
import { Types } from "mongoose";
import Application from "@/models/Application";
import Test from "@/models/Test";
import TestResult from "@/models/TestResult";
import TestQuestion from "@/models/TestQuestion";
import QuestionBank from "@/models/QuestionBank";
import StudentAnswer from "@/models/StudentAnswer";
import StudentTestAccess from "@/models/StudentTestAccess";
import type { StudentTestAccessDocument } from "@/models/StudentTestAccess";
import { getSessionFromRequest } from "@/lib/student-session";
import { isExamTimeExpired } from "@/lib/exam-access";

export type GradedExamResult = {
  totalScore: number;
  correctQuestions: number;
  incorrectQuestions: number;
  unattemptedQuestions: number;
  accuracyPercentage: number;
  totalTimeSpentSeconds: number;
  autoSubmitted?: boolean;
};

export async function getStudentFromExamRequest(req: Request) {
  const payload = getSessionFromRequest(req);
  if (!payload) return null;

  await connectDB();
  return Application.findOne({ email: payload.email, phoneNumber: payload.phoneNumber }).lean();
}

export async function verifyExamAccessOwner(req: Request, studentId: unknown) {
  const student = await getStudentFromExamRequest(req);
  if (!student) {
    return {
      ok: false as const,
      status: 401,
      error: "Student login required. Open the exam from your student portal.",
    };
  }
  if (student._id.toString() !== String(studentId)) {
    return { ok: false as const, status: 403, error: "This exam link does not belong to your account." };
  }
  return { ok: true as const, student };
}

export async function gradeAndSubmitAccess(
  accessInput: StudentTestAccessDocument | { _id: unknown },
  options: {
    clientAnswers?: Record<string, unknown>;
    autoExpired?: boolean;
  } = {},
): Promise<GradedExamResult> {
  await connectDB();

  const access = await StudentTestAccess.findById(accessInput._id);
  if (!access) {
    throw new Error("Access record not found.");
  }

  const existingResult = await TestResult.findOne({ accessId: access._id }).lean();
  if (existingResult) {
    if (access.status !== "Submitted" && access.status !== "Terminated") {
      access.status = "Submitted";
      if (!access.submittedAt) access.submittedAt = new Date();
      await access.save();
    }
    return {
      totalScore: existingResult.totalScore,
      correctQuestions: existingResult.correctQuestions,
      incorrectQuestions: existingResult.incorrectQuestions,
      unattemptedQuestions: existingResult.unattemptedQuestions,
      accuracyPercentage: existingResult.accuracyPercentage,
      totalTimeSpentSeconds: existingResult.totalTimeSpentSeconds,
      autoSubmitted: options.autoExpired ?? false,
    };
  }

  if (access.status === "Submitted" || access.status === "Terminated") {
    throw new Error("Test has already been submitted.");
  }

  const test = await Test.findById(access.testId).lean();
  if (!test) {
    throw new Error("Test not found.");
  }

  const serverDraft =
    access.answersDraft && typeof access.answersDraft === "object"
      ? (access.answersDraft as Record<string, unknown>)
      : {};
  const answers = { ...serverDraft, ...(options.clientAnswers || {}) };

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

  for (const tq of testQuestions) {
    const qBank = questionsFromBank.find((q) => q._id.toString() === tq.questionId.toString());
    if (!qBank) continue;

    const studentAns = answers[qBank._id.toString()];
    let isCorrect = false;
    let isAttempted = false;

    let selectedOptionIds: string[] = [];
    let integerAnswer: number | null = null;

    if (qBank.questionType === "Single Correct") {
      if (studentAns !== undefined && studentAns !== "") {
        isAttempted = true;
        selectedOptionIds = [String(studentAns)];
        const correctOption = qBank.options.find(
          (opt: { isCorrect?: boolean; _id: unknown }) => opt.isCorrect,
        );
        if (correctOption && correctOption._id.toString() === String(studentAns)) {
          isCorrect = true;
        }
      }
    } else if (qBank.questionType === "Multiple Correct") {
      if (Array.isArray(studentAns) && studentAns.length > 0) {
        isAttempted = true;
        selectedOptionIds = studentAns.map(String);
        const correctOptionIds = qBank.options
          .filter((opt: { isCorrect?: boolean }) => opt.isCorrect)
          .map((opt: { _id: unknown }) => String(opt._id));
        const matchesAll =
          correctOptionIds.length === selectedOptionIds.length &&
          selectedOptionIds.every((id) => correctOptionIds.includes(id));
        if (matchesAll) isCorrect = true;
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

    await StudentAnswer.findOneAndUpdate(
      { accessId: access._id, questionId: qBank._id },
      {
        testId: test._id,
        studentId: access.studentId,
        selectedOptionIds,
        integerAnswer,
        status: isAttempted ? "Answered" : "Not Answered",
        timeSpentSeconds:
          (access.questionTimings ?? []).find(
            (t: { questionId: string }) => t.questionId === qBank._id.toString(),
          )?.elapsedSeconds ?? 0,
      },
      { upsert: true, new: true },
    );

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

  totalScore = Math.max(0, totalScore);

  const attemptedCount = correctQuestions + incorrectQuestions;
  const accuracyPercentage =
    attemptedCount > 0 ? Math.round((correctQuestions / attemptedCount) * 100) : 0;

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
    { upsert: true },
  );

  access.status = "Submitted";
  access.submittedAt = submissionTime;
  await access.save();

  return {
    totalScore,
    correctQuestions,
    incorrectQuestions,
    unattemptedQuestions,
    accuracyPercentage,
    totalTimeSpentSeconds,
    autoSubmitted: options.autoExpired ?? false,
  };
}

export async function finalizeAccessIfExpired(
  access: StudentTestAccessDocument,
  test: { durationMinutes: number; startDateTime: Date; endDateTime: Date },
  clientAnswers?: Record<string, unknown>,
) {
  if (!isExamTimeExpired(test, access)) return null;
  return gradeAndSubmitAccess(access, { clientAnswers, autoExpired: true });
}

export async function gradeAndSubmitOnWindowClose(
  accessInput: StudentTestAccessDocument | { _id: unknown },
  clientAnswers?: Record<string, unknown>,
) {
  return gradeAndSubmitAccess(accessInput, { clientAnswers, autoExpired: true });
}

export async function getExistingResultPayload(accessId: Types.ObjectId | string) {
  await connectDB();
  const existingResult = await TestResult.findOne({ accessId }).lean();
  if (!existingResult) return null;
  return {
    totalScore: existingResult.totalScore,
    correctQuestions: existingResult.correctQuestions,
    incorrectQuestions: existingResult.incorrectQuestions,
    unattemptedQuestions: existingResult.unattemptedQuestions,
    accuracyPercentage: existingResult.accuracyPercentage,
    autoSubmitted: true,
  };
}
