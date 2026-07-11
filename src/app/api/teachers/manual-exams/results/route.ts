import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Application from "@/models/Application";
import ManualExam from "@/models/ManualExam";
import ManualExamResult from "@/models/ManualExamResult";
import { getTeacherFromRequest } from "@/lib/teacher-auth";
import { moduleQueryFilter } from "@/lib/module-match";

type IncomingResult = {
  studentId?: string;
  score?: number | string | null;
  remarks?: string;
};

export async function PUT(req: Request) {
  try {
    const teacher = await getTeacherFromRequest(req);
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const manualExamId = String(body.manualExamId ?? "").trim();
    const rows: IncomingResult[] = Array.isArray(body.results) ? body.results : [];

    if (!manualExamId) {
      return NextResponse.json({ error: "manualExamId is required" }, { status: 400 });
    }

    const exam = await ManualExam.findOne({ _id: manualExamId, createdBy: teacher._id });
    if (!exam) {
      return NextResponse.json({ error: "Manual exam not found" }, { status: 404 });
    }

    const moduleStudents = await Application.find(moduleQueryFilter(exam.subject, exam.subpart))
      .select("_id")
      .lean();
    const allowedStudentIds = new Set(moduleStudents.map((s) => s._id.toString()));

    const toUpsert: { studentId: string; score: number; remarks: string }[] = [];
    const toClear: string[] = [];

    for (const row of rows) {
      const studentId = String(row.studentId ?? "").trim();
      if (!studentId || !allowedStudentIds.has(studentId)) continue;

      const raw = row.score;
      const remarks = String(row.remarks ?? "").trim();

      if (raw === null || raw === undefined || raw === "") {
        toClear.push(studentId);
        continue;
      }

      const score = Number(raw);
      if (!Number.isFinite(score) || score < 0 || score > exam.maxMarks) {
        return NextResponse.json(
          { error: `Score must be between 0 and ${exam.maxMarks}` },
          { status: 400 },
        );
      }

      toUpsert.push({ studentId, score, remarks });
    }

    const ops = [];

    for (const row of toUpsert) {
      ops.push(
        ManualExamResult.updateOne(
          {
            manualExamId: exam._id,
            studentId: new mongoose.Types.ObjectId(row.studentId),
          },
          {
            $set: {
              score: row.score,
              remarks: row.remarks,
              enteredBy: teacher._id,
            },
            $setOnInsert: {
              manualExamId: exam._id,
              studentId: new mongoose.Types.ObjectId(row.studentId),
            },
          },
          { upsert: true },
        ),
      );
    }

    if (toClear.length > 0) {
      ops.push(
        ManualExamResult.deleteMany({
          manualExamId: exam._id,
          studentId: { $in: toClear.map((id) => new mongoose.Types.ObjectId(id)) },
        }),
      );
    }

    await Promise.all(ops);

    const savedCount = await ManualExamResult.countDocuments({ manualExamId: exam._id });

    return NextResponse.json({ ok: true, savedCount });
  } catch (error) {
    console.error("PUT /api/teachers/manual-exams/results error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
