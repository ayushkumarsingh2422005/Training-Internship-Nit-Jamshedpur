import { parseDateTimeInput } from "@/lib/datetime-local";
import QuestionBank from "@/models/QuestionBank";
import Test from "@/models/Test";
import TestQuestion from "@/models/TestQuestion";
import StudentTestAccess from "@/models/StudentTestAccess";
import type { Types } from "mongoose";

export type QuestionInput = {
  questionId?: string;
  testQuestionId?: string;
  questionText: string;
  questionType: string;
  options?: { text: string; isCorrect: boolean }[];
  correctIntegerAnswer?: number | null;
  explanation?: string;
  marks: number;
  negativeMarks: number;
  timeLimitSeconds?: number;
  topic?: string;
  difficulty?: string;
};

export async function testHasActiveAttempts(testId: string) {
  const count = await StudentTestAccess.countDocuments({
    testId,
    status: { $in: ["In Progress", "Submitted"] },
  });
  return count > 0;
}

export async function getTestWithQuestions(testId: string) {
  const test = await Test.findById(testId).lean();
  if (!test) return null;

  const testQuestions = await TestQuestion.find({ testId: test._id }).sort({ order: 1 }).lean();
  const questionIds = testQuestions.map((tq) => tq.questionId);
  const bankQuestions = await QuestionBank.find({ _id: { $in: questionIds } }).lean();

  const questions = testQuestions
    .map((tq) => {
      const bank = bankQuestions.find((q) => q._id.toString() === tq.questionId.toString());
      if (!bank) return null;
      return {
        questionId: bank._id.toString(),
        testQuestionId: tq._id.toString(),
        questionText: bank.questionText,
        questionType: bank.questionType,
        options: bank.options,
        correctIntegerAnswer: bank.correctIntegerAnswer,
        explanation: bank.explanation,
        marks: tq.marks,
        negativeMarks: tq.negativeMarks,
        timeLimitSeconds: tq.timeLimitSeconds ?? 0,
        topic: bank.topic,
        difficulty: bank.difficulty,
      };
    })
    .filter(Boolean);

  const hasSubmissions = await testHasActiveAttempts(testId);

  return { test, questions, hasSubmissions };
}

export async function updateTestWithQuestions(
  testId: string,
  payload: {
    testName: string;
    subject: string;
    subpart: string;
    startDateTime: string;
    endDateTime: string;
    durationMinutes: number;
    instructions?: string;
    totalMarks: number;
    isNegativeMarking: boolean;
    randomizeQuestions: boolean;
    status?: string;
    questions?: QuestionInput[];
  },
  questionAuthorId: Types.ObjectId,
) {
  const existing = await Test.findById(testId);
  if (!existing) return { ok: false as const, status: 404, error: "Test not found." };

  const hasSubmissions = await testHasActiveAttempts(testId);
  if (hasSubmissions) {
    return {
      ok: false as const,
      status: 403,
      error: "Cannot edit a test that already has student attempts or submissions.",
    };
  }

  const {
    testName,
    subject,
    subpart,
    startDateTime,
    endDateTime,
    durationMinutes,
    instructions,
    totalMarks,
    isNegativeMarking,
    randomizeQuestions,
    status,
    questions,
  } = payload;

  if (!testName || !subject || !subpart || !startDateTime || !endDateTime || !durationMinutes) {
    return { ok: false as const, status: 400, error: "Missing required test fields." };
  }

  existing.testName = testName;
  existing.subject = subject;
  existing.subpart = subpart;
  existing.startDateTime = parseDateTimeInput(startDateTime);
  existing.endDateTime = parseDateTimeInput(endDateTime);
  existing.durationMinutes = Number(durationMinutes);
  existing.instructions = instructions || "";
  existing.totalMarks = Number(totalMarks) || 0;
  existing.isNegativeMarking = Boolean(isNegativeMarking);
  existing.randomizeQuestions = randomizeQuestions !== false;
  if (status) existing.status = status as "Draft" | "Published" | "Archived";
  await existing.save();

  if (Array.isArray(questions)) {
    const existingLinks = await TestQuestion.find({ testId }).lean();
    const incomingIds = new Set(
      questions.filter((q) => q.testQuestionId).map((q) => q.testQuestionId),
    );

    for (const link of existingLinks) {
      if (!incomingIds.has(link._id.toString())) {
        await TestQuestion.deleteOne({ _id: link._id });
      }
    }

    let order = 0;
    for (const qData of questions) {
      if (qData.testQuestionId && qData.questionId) {
        await QuestionBank.findByIdAndUpdate(qData.questionId, {
          questionType: qData.questionType as "Single Correct" | "Multiple Correct" | "Integer Type",
          questionText: qData.questionText,
          options: qData.options || [],
          correctIntegerAnswer:
            qData.correctIntegerAnswer !== undefined && qData.correctIntegerAnswer !== null
              ? Number(qData.correctIntegerAnswer)
              : null,
          explanation: qData.explanation || "",
          topic: qData.topic || "",
          difficulty: (qData.difficulty || "Medium") as "Easy" | "Medium" | "Hard",
        });
        await TestQuestion.findByIdAndUpdate(qData.testQuestionId, {
          marks: Number(qData.marks) || 1,
          negativeMarks: Number(qData.negativeMarks) || 0,
          timeLimitSeconds: Number(qData.timeLimitSeconds) || 0,
          order: order++,
        });
      } else {
        const qDoc = await QuestionBank.create({
          subject,
          subpart,
          topic: qData.topic || "",
          difficulty: (qData.difficulty || "Medium") as "Easy" | "Medium" | "Hard",
          questionType: qData.questionType as "Single Correct" | "Multiple Correct" | "Integer Type",
          questionText: qData.questionText,
          options: qData.options || [],
          correctIntegerAnswer:
            qData.correctIntegerAnswer !== undefined && qData.correctIntegerAnswer !== null
              ? Number(qData.correctIntegerAnswer)
              : null,
          explanation: qData.explanation || "",
          createdBy: questionAuthorId,
        });
        await TestQuestion.create({
          testId,
          questionId: qDoc._id,
          marks: Number(qData.marks) || 1,
          negativeMarks: Number(qData.negativeMarks) || 0,
          timeLimitSeconds: Number(qData.timeLimitSeconds) || 0,
          order: order++,
        });
      }
    }
  }

  return { ok: true as const, test: existing };
}
