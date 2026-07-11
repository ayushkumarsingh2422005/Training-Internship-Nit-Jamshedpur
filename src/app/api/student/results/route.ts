import { NextResponse } from "next/server";
import { headers } from "next/headers";
import connectDB from "@/lib/mongodb";
import Application from "@/models/Application";
import Test from "@/models/Test";
import TestResult from "@/models/TestResult";
import ManualExam from "@/models/ManualExam";
import ManualExamResult from "@/models/ManualExamResult";
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

export async function GET() {
  const student = await getStudent();
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [cbtResults, manualResults] = await Promise.all([
      TestResult.find({ studentId: student._id })
        .populate({
          path: "testId",
          model: Test,
          select: "testName subject subpart totalMarks endDateTime startDateTime",
        })
        .sort({ createdAt: -1 })
        .lean(),
      ManualExamResult.find({ studentId: student._id })
        .populate({
          path: "manualExamId",
          model: ManualExam,
          select: "examName subject subpart examType maxMarks examDate notes",
        })
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    const now = new Date();
    const items: {
      id: string;
      source: "cbt" | "manual";
      examName: string;
      subject: string;
      subpart: string;
      examType: string;
      score: number;
      maxMarks: number;
      examDate: string | null;
      canDownloadReport: boolean;
      testId: string | null;
      remarks: string;
      accuracyPercentage: number | null;
    }[] = [];

    for (const row of cbtResults) {
      const test = row.testId as
        | {
            _id: { toString(): string };
            testName?: string;
            subject?: string;
            subpart?: string;
            totalMarks?: number;
            endDateTime?: Date | string;
            startDateTime?: Date | string;
          }
        | null
        | undefined;
      if (!test || typeof test !== "object" || !("testName" in test)) continue;

      const end = test.endDateTime ? new Date(test.endDateTime) : null;
      const canDownloadReport = Boolean(end && now > end);

      items.push({
        id: row._id.toString(),
        source: "cbt",
        examName: test.testName || "CBT Exam",
        subject: test.subject || "",
        subpart: test.subpart || "",
        examType: "CBT",
        score: row.totalScore,
        maxMarks: test.totalMarks ?? 0,
        examDate: test.startDateTime ? new Date(test.startDateTime).toISOString() : null,
        canDownloadReport,
        testId: test._id.toString(),
        remarks: "",
        accuracyPercentage: row.accuracyPercentage ?? null,
      });
    }

    for (const row of manualResults) {
      const exam = row.manualExamId as
        | {
            _id: { toString(): string };
            examName?: string;
            subject?: string;
            subpart?: string;
            examType?: string;
            maxMarks?: number;
            examDate?: Date | string | null;
            notes?: string;
          }
        | null
        | undefined;
      if (!exam || typeof exam !== "object" || !("examName" in exam)) continue;

      items.push({
        id: row._id.toString(),
        source: "manual",
        examName: exam.examName || "Exam",
        subject: exam.subject || "",
        subpart: exam.subpart || "",
        examType: exam.examType || "Theory",
        score: row.score,
        maxMarks: exam.maxMarks ?? 0,
        examDate: exam.examDate ? new Date(exam.examDate).toISOString() : null,
        canDownloadReport: false,
        testId: null,
        remarks: row.remarks || "",
        accuracyPercentage: null,
      });
    }

    items.sort((a, b) => {
      const aTime = a.examDate ? new Date(a.examDate).getTime() : 0;
      const bTime = b.examDate ? new Date(b.examDate).getTime() : 0;
      return bTime - aTime;
    });

    const totalGot = items.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
    const totalMax = items.reduce((sum, item) => sum + (Number(item.maxMarks) || 0), 0);
    const overallPercentage = totalMax > 0 ? Math.round((totalGot / totalMax) * 10000) / 100 : 0;

    return NextResponse.json({
      results: items,
      summary: {
        examCount: items.length,
        totalGot,
        totalMax,
        overallPercentage,
      },
    });
  } catch (error) {
    console.error("GET /api/student/results error:", error);
    return NextResponse.json({ error: "Failed to load results" }, { status: 500 });
  }
}
