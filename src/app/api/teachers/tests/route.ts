import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import QuestionBank from "@/models/QuestionBank";
import TestQuestion from "@/models/TestQuestion";
import StudentTestAccess from "@/models/StudentTestAccess";
import Teacher from "@/models/Teacher";
import { verifyTeacherSessionToken } from "@/lib/teacher-session";

async function getTeacherFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);
  const payload = await verifyTeacherSessionToken(token);
  if (!payload) return null;

  await connectDB();
  return await Teacher.findOne({ email: payload.email, phoneNumber: payload.phoneNumber });
}

type QuestionInput = {
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

async function createQuestionsForTest(
  testId: unknown,
  subject: string,
  subpart: string,
  teacherId: unknown,
  questions: QuestionInput[],
) {
  let currentOrder = 0;
  for (const qData of questions) {
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
      createdBy: teacherId as import("mongoose").Types.ObjectId,
    });

    await TestQuestion.create({
      testId: testId as import("mongoose").Types.ObjectId,
      questionId: qDoc._id,
      marks: Number(qData.marks) || 1,
      negativeMarks: Number(qData.negativeMarks) || 0,
      timeLimitSeconds: Number(qData.timeLimitSeconds) || 0,
      order: currentOrder++,
    });
  }
}

async function testHasActiveAttempts(testId: string) {
  const count = await StudentTestAccess.countDocuments({
    testId,
    status: { $in: ["In Progress", "Submitted"] },
  });
  return count > 0;
}

export async function GET(req: Request) {
  try {
    const teacher = await getTeacherFromRequest(req);
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("id");

    if (testId) {
      const test = await Test.findOne({ _id: testId, createdBy: teacher._id }).lean();
      if (!test) {
        return NextResponse.json({ error: "Test not found." }, { status: 404 });
      }

      const testQuestions = await TestQuestion.find({ testId: test._id })
        .sort({ order: 1 })
        .lean();
      const questionIds = testQuestions.map((tq) => tq.questionId);
      const bankQuestions = await QuestionBank.find({ _id: { $in: questionIds } }).lean();

      const questions = testQuestions.map((tq) => {
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
      }).filter(Boolean);

      const hasSubmissions = await testHasActiveAttempts(testId);

      return NextResponse.json({ test, questions, hasSubmissions });
    }

    const tests = await Test.find({ createdBy: teacher._id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ tests });
  } catch (error) {
    console.error("GET /api/teachers/tests error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const teacher = await getTeacherFromRequest(req);
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
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
    } = body;

    if (!testName || !subject || !subpart || !startDateTime || !endDateTime || !durationMinutes) {
      return NextResponse.json({ error: "Missing required test fields." }, { status: 400 });
    }

    const test = await Test.create({
      testName,
      subject,
      subpart,
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
      durationMinutes: Number(durationMinutes),
      instructions: instructions || "",
      totalMarks: Number(totalMarks) || 0,
      isNegativeMarking: Boolean(isNegativeMarking),
      randomizeQuestions: randomizeQuestions !== false,
      status: status || "Draft",
      createdBy: teacher._id,
    });

    if (Array.isArray(questions) && questions.length > 0) {
      await createQuestionsForTest(test._id, subject, subpart, teacher._id, questions);
    }

    return NextResponse.json({ success: true, testId: test._id });
  } catch (error: unknown) {
    console.error("POST /api/teachers/tests error:", error);
    const message = error instanceof Error ? error.message : "Failed to create test.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const teacher = await getTeacherFromRequest(req);
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      testId,
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
    } = body;

    if (!testId) {
      return NextResponse.json({ error: "Missing testId." }, { status: 400 });
    }

    const existing = await Test.findOne({ _id: testId, createdBy: teacher._id });
    if (!existing) {
      return NextResponse.json({ error: "Test not found or unauthorized." }, { status: 404 });
    }

    const hasSubmissions = await testHasActiveAttempts(testId);
    if (hasSubmissions) {
      return NextResponse.json(
        { error: "Cannot edit a test that already has student attempts or submissions." },
        { status: 403 },
      );
    }

    if (!testName || !subject || !subpart || !startDateTime || !endDateTime || !durationMinutes) {
      return NextResponse.json({ error: "Missing required test fields." }, { status: 400 });
    }

    existing.testName = testName;
    existing.subject = subject;
    existing.subpart = subpart;
    existing.startDateTime = new Date(startDateTime);
    existing.endDateTime = new Date(endDateTime);
    existing.durationMinutes = Number(durationMinutes);
    existing.instructions = instructions || "";
    existing.totalMarks = Number(totalMarks) || 0;
    existing.isNegativeMarking = Boolean(isNegativeMarking);
    existing.randomizeQuestions = randomizeQuestions !== false;
    if (status) existing.status = status;
    await existing.save();

    if (Array.isArray(questions)) {
      const existingLinks = await TestQuestion.find({ testId }).lean();
      const incomingIds = new Set(
        questions
          .filter((q: QuestionInput) => q.testQuestionId)
          .map((q: QuestionInput) => q.testQuestionId),
      );

      for (const link of existingLinks) {
        if (!incomingIds.has(link._id.toString())) {
          await TestQuestion.deleteOne({ _id: link._id });
        }
      }

      let order = 0;
      for (const qData of questions as QuestionInput[]) {
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
            createdBy: teacher._id,
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

    return NextResponse.json({ success: true, test: existing });
  } catch (error: unknown) {
    console.error("PUT /api/teachers/tests error:", error);
    const message = error instanceof Error ? error.message : "Failed to update test.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const teacher = await getTeacherFromRequest(req);
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { testId, status } = await req.json();
    if (!testId || !status) {
      return NextResponse.json({ error: "Missing testId or status." }, { status: 400 });
    }

    const test = await Test.findOneAndUpdate(
      { _id: testId, createdBy: teacher._id },
      { status },
      { new: true },
    );

    if (!test) {
      return NextResponse.json({ error: "Test not found or unauthorized." }, { status: 404 });
    }

    return NextResponse.json({ success: true, test });
  } catch (error: unknown) {
    console.error("PATCH /api/teachers/tests error:", error);
    const message = error instanceof Error ? error.message : "Failed to update test.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
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

    const test = await Test.findOneAndDelete({ _id: testId, createdBy: teacher._id });
    if (!test) {
      return NextResponse.json({ error: "Test not found or unauthorized." }, { status: 404 });
    }

    await TestQuestion.deleteMany({ testId });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE /api/teachers/tests error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete test.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
