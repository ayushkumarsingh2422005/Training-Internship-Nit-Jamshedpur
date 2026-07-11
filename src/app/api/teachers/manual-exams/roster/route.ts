import { NextResponse } from "next/server";
import Application from "@/models/Application";
import ManualExam from "@/models/ManualExam";
import ManualExamResult from "@/models/ManualExamResult";
import { getTeacherFromRequest } from "@/lib/teacher-auth";
import { moduleQueryFilter } from "@/lib/module-match";

export async function GET(req: Request) {
  try {
    const teacher = await getTeacherFromRequest(req);
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const manualExamId = searchParams.get("manualExamId");
    if (!manualExamId) {
      return NextResponse.json({ error: "manualExamId is required" }, { status: 400 });
    }

    const exam = await ManualExam.findOne({ _id: manualExamId, createdBy: teacher._id }).lean();
    if (!exam) {
      return NextResponse.json({ error: "Manual exam not found" }, { status: 404 });
    }

    const [students, results] = await Promise.all([
      Application.find(moduleQueryFilter(exam.subject, exam.subpart))
        .select("fullName email internId collegeName subject subpart")
        .sort({ fullName: 1 })
        .lean(),
      ManualExamResult.find({ manualExamId: exam._id }).lean(),
    ]);

    const resultByStudent = new Map(results.map((r) => [r.studentId.toString(), r]));

    return NextResponse.json({
      exam,
      students: students.map((student) => {
        const existing = resultByStudent.get(student._id.toString());
        return {
          id: student._id.toString(),
          fullName: student.fullName,
          email: student.email,
          internId: student.internId ?? null,
          collegeName: student.collegeName,
          score: existing?.score ?? null,
          remarks: existing?.remarks ?? "",
          resultId: existing?._id?.toString() ?? null,
        };
      }),
    });
  } catch (error) {
    console.error("GET /api/teachers/manual-exams/roster error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
