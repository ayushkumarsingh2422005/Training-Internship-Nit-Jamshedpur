import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import StudentTestAccess from "@/models/StudentTestAccess";
import { upsertQuestionTiming, type QuestionTiming } from "@/lib/exam-utils";
import { isExamTimeExpired, getExamTimeState } from "@/lib/exam-access";
import {
  finalizeAccessIfExpired,
  gradeAndSubmitAccess,
  gradeAndSubmitOnWindowClose,
  getExistingResultPayload,
  verifyExamAccessOwner,
} from "@/lib/exam-grade-submit";

type SyncEvent = "start" | "answer" | "tab_switch" | "focus_loss" | "heartbeat" | "question_nav";

function formatGradedResult(result: {
  totalScore: number;
  correctQuestions: number;
  incorrectQuestions: number;
  unattemptedQuestions: number;
  accuracyPercentage: number;
}) {
  return {
    totalScore: result.totalScore,
    correctQuestions: result.correctQuestions,
    incorrectQuestions: result.incorrectQuestions,
    unattemptedQuestions: result.unattemptedQuestions,
    accuracyPercentage: result.accuracyPercentage,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      studentHash,
      secureToken,
      answers,
      currentQuestionIndex,
      questionTimings,
      event,
    } = body as {
      studentHash?: string;
      secureToken?: string;
      answers?: Record<string, unknown>;
      currentQuestionIndex?: number;
      questionTimings?: QuestionTiming[];
      event?: SyncEvent;
    };

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
        return NextResponse.json({
          expired: true,
          result: existingResult,
          forceExit: true,
          tabSwitches: access.tabSwitches,
          focusLosses: access.focusLosses,
        });
      }
      return NextResponse.json(
        {
          error:
            access.status === "Terminated"
              ? "This attempt was terminated. You cannot continue the exam."
              : "This test has already been submitted.",
          forceExit: true,
        },
        { status: 403 },
      );
    }

    const test = await Test.findById(access.testId).lean();
    if (!test || test.status !== "Published") {
      return NextResponse.json({ error: "Test is not active." }, { status: 404 });
    }

    const now = new Date();

    if (event === "start") {
      if (!access.startedAt) {
        access.startedAt = now;
      }
      access.status = "In Progress";
    } else if (access.status === "Not Started" || !access.startedAt) {
      return NextResponse.json({ error: "Exam has not been started yet." }, { status: 400 });
    }

    const timeState = getExamTimeState(test, access, now);

    if (timeState.windowClosed) {
      try {
        const result = await gradeAndSubmitOnWindowClose(access, answers);
        return NextResponse.json({
          expired: true,
          result: formatGradedResult(result),
          tabSwitches: access.tabSwitches,
          focusLosses: access.focusLosses,
        });
      } catch (err) {
        console.error("Auto-grade on window close (sync) failed:", err);
        return NextResponse.json({ error: "Test time window has closed." }, { status: 403 });
      }
    }

    if (isExamTimeExpired(test, access, now)) {
      const result =
        (await finalizeAccessIfExpired(access, test, answers)) ??
        (await gradeAndSubmitAccess(access, { clientAnswers: answers, autoExpired: true }));
      return NextResponse.json({
        expired: true,
        result: formatGradedResult(result),
        tabSwitches: access.tabSwitches,
        focusLosses: access.focusLosses,
      });
    }

    if (event === "tab_switch") {
      access.tabSwitches = (access.tabSwitches ?? 0) + 1;
    } else if (event === "focus_loss") {
      access.focusLosses = (access.focusLosses ?? 0) + 1;
    }

    if (answers && typeof answers === "object") {
      access.answersDraft = {
        ...(access.answersDraft as Record<string, unknown> || {}),
        ...answers,
      };
      access.markModified("answersDraft");
    }

    if (typeof currentQuestionIndex === "number" && currentQuestionIndex >= 0) {
      access.currentQuestionIndex = currentQuestionIndex;
    }

    if (Array.isArray(questionTimings)) {
      let merged: QuestionTiming[] = [...(access.questionTimings ?? [])];
      for (const timing of questionTimings) {
        if (timing?.questionId && typeof timing.elapsedSeconds === "number") {
          merged = upsertQuestionTiming(merged, timing.questionId, timing.elapsedSeconds);
        }
      }
      access.set("questionTimings", merged);
    }

    await access.save();

    const refreshedTimeState = getExamTimeState(test, access, now);

    return NextResponse.json({
      success: true,
      tabSwitches: access.tabSwitches,
      focusLosses: access.focusLosses,
      answersDraft: access.answersDraft ?? {},
      currentQuestionIndex: access.currentQuestionIndex,
      questionTimings: access.questionTimings ?? [],
      timeLeftSeconds: refreshedTimeState.timeLeftSeconds,
      attemptStarted: Boolean(access.startedAt),
    });
  } catch (error) {
    console.error("POST /api/student/tests/sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
