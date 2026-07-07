import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import StudentTestAccess from "@/models/StudentTestAccess";
import { getExamTimeState } from "@/lib/exam-access";
import {
  finalizeAccessIfExpired,
  gradeAndSubmitAccess,
  gradeAndSubmitOnWindowClose,
  getExistingResultPayload,
  verifyExamAccessOwner,
} from "@/lib/exam-grade-submit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentHash, secureToken, answers: clientAnswers } = body;

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

    if (access.status === "Submitted" || access.status === "Terminated") {
      const existingResult = await getExistingResultPayload(access._id);
      if (existingResult) {
        return NextResponse.json({ success: true, result: existingResult, alreadySubmitted: true });
      }
      return NextResponse.json(
        {
          error:
            access.status === "Terminated"
              ? "This attempt was terminated."
              : "Test has already been submitted.",
          forceExit: true,
        },
        { status: 403 },
      );
    }

    if (!access.startedAt) {
      return NextResponse.json({ error: "Exam has not been started yet." }, { status: 400 });
    }

    const test = await Test.findById(access.testId).lean();
    if (!test) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }

    const now = new Date();
    const timeState = getExamTimeState(test, access, now);

    if (timeState.windowClosed) {
      try {
        const result = await gradeAndSubmitOnWindowClose(access, clientAnswers);
        return NextResponse.json({ success: true, result, autoExpired: true });
      } catch (err) {
        console.error("Auto-grade on window close (submit) failed:", err);
        return NextResponse.json(
          { error: "Submission blocked: The test time window has already closed." },
          { status: 403 },
        );
      }
    }

    if (timeState.personalExpired) {
      const result = await finalizeAccessIfExpired(access, test, clientAnswers);
      if (result) {
        return NextResponse.json({ success: true, result, autoExpired: true });
      }
    }

    const result = await gradeAndSubmitAccess(access, { clientAnswers });

    return NextResponse.json({
      success: true,
      result: {
        totalScore: result.totalScore,
        correctQuestions: result.correctQuestions,
        incorrectQuestions: result.incorrectQuestions,
        unattemptedQuestions: result.unattemptedQuestions,
        accuracyPercentage: result.accuracyPercentage,
      },
    });
  } catch (error) {
    console.error("POST /api/student/tests/submit error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
