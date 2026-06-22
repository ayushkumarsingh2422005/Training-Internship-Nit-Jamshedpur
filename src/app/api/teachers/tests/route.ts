import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import QuestionBank from "@/models/QuestionBank";
import TestQuestion from "@/models/TestQuestion";
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

export async function GET(req: Request) {
  try {
    const teacher = await getTeacherFromRequest(req);
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      status,
      questions,
    } = body;

    if (!testName || !subject || !subpart || !startDateTime || !endDateTime || !durationMinutes) {
      return NextResponse.json({ error: "Missing required test fields." }, { status: 400 });
    }

    // 1. Create Test Document
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
      status: status || "Draft",
      createdBy: teacher._id,
    });

    // 2. Create Questions and Link them
    if (Array.isArray(questions) && questions.length > 0) {
      let currentOrder = 0;
      for (const qData of questions) {
        // Create Question in QuestionBank
        const qDoc = await QuestionBank.create({
          subject,
          subpart,
          topic: qData.topic || "",
          difficulty: qData.difficulty || "Medium",
          questionType: qData.questionType,
          questionText: qData.questionText,
          options: qData.options || [],
          correctIntegerAnswer: qData.correctIntegerAnswer !== undefined ? Number(qData.correctIntegerAnswer) : null,
          explanation: qData.explanation || "",
          createdBy: teacher._id,
        });

        // Link in TestQuestion
        await TestQuestion.create({
          testId: test._id,
          questionId: qDoc._id,
          marks: Number(qData.marks) || 1,
          negativeMarks: Number(qData.negativeMarks) || 0,
          order: currentOrder++,
        });
      }
    }

    return NextResponse.json({ success: true, testId: test._id });
  } catch (error: any) {
    console.error("POST /api/teachers/tests error:", error);
    return NextResponse.json({ error: error.message || "Failed to create test." }, { status: 500 });
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
      { new: true }
    );

    if (!test) {
      return NextResponse.json({ error: "Test not found or unauthorized." }, { status: 404 });
    }

    return NextResponse.json({ success: true, test });
  } catch (error: any) {
    console.error("PATCH /api/teachers/tests error:", error);
    return NextResponse.json({ error: error.message || "Failed to update test." }, { status: 500 });
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

    // Also delete linked TestQuestions
    await TestQuestion.deleteMany({ testId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/teachers/tests error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete test." }, { status: 500 });
  }
}
