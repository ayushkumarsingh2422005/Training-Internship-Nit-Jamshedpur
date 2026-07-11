import { NextResponse } from "next/server";
import { headers } from "next/headers";
import connectDB from "@/lib/mongodb";
import Application from "@/models/Application";
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
    const results = await ManualExamResult.find({ studentId: student._id })
      .sort({ updatedAt: -1 })
      .lean();

    if (results.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const examIds = results.map((r) => r.manualExamId);
    const exams = await ManualExam.find({ _id: { $in: examIds } }).lean();
    const examById = new Map(exams.map((e) => [e._id.toString(), e]));

    return NextResponse.json({
      results: results
        .map((result) => {
          const exam = examById.get(result.manualExamId.toString());
          if (!exam) return null;
          return {
            id: result._id.toString(),
            score: result.score,
            remarks: result.remarks || "",
            updatedAt: result.updatedAt,
            exam: {
              id: exam._id.toString(),
              examName: exam.examName,
              subject: exam.subject,
              subpart: exam.subpart,
              examType: exam.examType,
              maxMarks: exam.maxMarks,
              examDate: exam.examDate,
              notes: exam.notes || "",
            },
          };
        })
        .filter(Boolean),
    });
  } catch (error) {
    console.error("GET /api/student/manual-results error:", error);
    return NextResponse.json({ error: "Failed to load results" }, { status: 500 });
  }
}
