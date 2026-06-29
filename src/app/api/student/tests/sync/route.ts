import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import StudentTestAccess from "@/models/StudentTestAccess";
import { upsertQuestionTiming, type QuestionTiming } from "@/lib/exam-utils";

type SyncEvent = "answer" | "tab_switch" | "focus_loss" | "heartbeat" | "question_nav";

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

    if (access.status === "Submitted" || access.status === "Terminated") {
      return NextResponse.json({ error: "Test has already been completed." }, { status: 403 });
    }

    const test = await Test.findById(access.testId).lean();
    if (!test || test.status !== "Published") {
      return NextResponse.json({ error: "Test is not active." }, { status: 404 });
    }

    const now = new Date();
    const end = new Date(test.endDateTime);
    if (now > end) {
      access.status = "Terminated";
      await access.save();
      return NextResponse.json({ error: "Test time window has closed." }, { status: 403 });
    }

    if (event === "tab_switch") {
      access.tabSwitches = (access.tabSwitches ?? 0) + 1;
    } else if (event === "focus_loss") {
      access.focusLosses = (access.focusLosses ?? 0) + 1;
    }

    if (answers && typeof answers === "object") {
      access.answersDraft = { ...(access.answersDraft as Record<string, unknown> || {}), ...answers };
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

    if (access.status === "Not Started") {
      access.status = "In Progress";
      if (!access.startedAt) access.startedAt = now;
    }

    await access.save();

    return NextResponse.json({
      success: true,
      tabSwitches: access.tabSwitches,
      focusLosses: access.focusLosses,
      answersDraft: access.answersDraft ?? {},
      currentQuestionIndex: access.currentQuestionIndex,
      questionTimings: access.questionTimings ?? [],
    });
  } catch (error) {
    console.error("POST /api/student/tests/sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
