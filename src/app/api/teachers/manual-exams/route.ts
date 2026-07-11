import { NextResponse } from "next/server";
import ManualExam from "@/models/ManualExam";
import ManualExamResult from "@/models/ManualExamResult";
import { getTeacherFromRequest, teacherOwnsModule } from "@/lib/teacher-auth";
import { normalizeSubject, normalizeSubpart } from "@/lib/module-match";

function parseExamDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(req: Request) {
  try {
    const teacher = await getTeacherFromRequest(req);
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const exam = await ManualExam.findOne({ _id: id, createdBy: teacher._id }).lean();
      if (!exam) {
        return NextResponse.json({ error: "Manual exam not found" }, { status: 404 });
      }
      return NextResponse.json({ exam });
    }

    const exams = await ManualExam.find({ createdBy: teacher._id }).sort({ createdAt: -1 }).lean();
    const examIds = exams.map((e) => e._id);
    const counts = await ManualExamResult.aggregate([
      { $match: { manualExamId: { $in: examIds } } },
      { $group: { _id: "$manualExamId", count: { $sum: 1 } } },
    ]);
    const countById = new Map(counts.map((c) => [c._id.toString(), c.count as number]));

    return NextResponse.json({
      exams: exams.map((exam) => ({
        ...exam,
        resultCount: countById.get(exam._id.toString()) ?? 0,
      })),
    });
  } catch (error) {
    console.error("GET /api/teachers/manual-exams error:", error);
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
    const examName = String(body.examName ?? "").trim();
    const subject = normalizeSubject(String(body.subject ?? ""));
    const subpart = normalizeSubpart(String(body.subpart ?? ""));
    const examType = body.examType === "Lab" || body.examType === "Other" ? body.examType : "Theory";
    const maxMarks = Number(body.maxMarks);
    const notes = String(body.notes ?? "").trim();
    const examDate = parseExamDate(body.examDate);

    if (!examName || !subject || !subpart) {
      return NextResponse.json({ error: "Exam name and module are required" }, { status: 400 });
    }
    if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
      return NextResponse.json({ error: "Max marks must be a positive number" }, { status: 400 });
    }
    if (!teacherOwnsModule(teacher, subject, subpart)) {
      return NextResponse.json({ error: "Module is not assigned to you" }, { status: 403 });
    }

    const exam = await ManualExam.create({
      examName,
      subject,
      subpart,
      examType,
      maxMarks,
      examDate,
      notes,
      createdBy: teacher._id,
    });

    return NextResponse.json({ exam }, { status: 201 });
  } catch (error) {
    console.error("POST /api/teachers/manual-exams error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const teacher = await getTeacherFromRequest(req);
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "Exam id is required" }, { status: 400 });
    }

    const existing = await ManualExam.findOne({ _id: id, createdBy: teacher._id });
    if (!existing) {
      return NextResponse.json({ error: "Manual exam not found" }, { status: 404 });
    }

    const examName = String(body.examName ?? existing.examName).trim();
    const subject = normalizeSubject(String(body.subject ?? existing.subject));
    const subpart = normalizeSubpart(String(body.subpart ?? existing.subpart));
    const examType =
      body.examType === "Lab" || body.examType === "Other" || body.examType === "Theory"
        ? body.examType
        : existing.examType;
    const maxMarks = body.maxMarks != null ? Number(body.maxMarks) : existing.maxMarks;
    const notes = body.notes != null ? String(body.notes).trim() : existing.notes;
    const examDate = body.examDate !== undefined ? parseExamDate(body.examDate) : existing.examDate;

    if (!examName || !subject || !subpart) {
      return NextResponse.json({ error: "Exam name and module are required" }, { status: 400 });
    }
    if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
      return NextResponse.json({ error: "Max marks must be a positive number" }, { status: 400 });
    }
    if (!teacherOwnsModule(teacher, subject, subpart)) {
      return NextResponse.json({ error: "Module is not assigned to you" }, { status: 403 });
    }

    existing.examName = examName;
    existing.subject = subject;
    existing.subpart = subpart;
    existing.examType = examType;
    existing.maxMarks = maxMarks;
    existing.notes = notes ?? "";
    existing.examDate = examDate;
    await existing.save();

    return NextResponse.json({ exam: existing });
  } catch (error) {
    console.error("PUT /api/teachers/manual-exams error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const teacher = await getTeacherFromRequest(req);
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Exam id is required" }, { status: 400 });
    }

    const existing = await ManualExam.findOne({ _id: id, createdBy: teacher._id });
    if (!existing) {
      return NextResponse.json({ error: "Manual exam not found" }, { status: 404 });
    }

    await ManualExamResult.deleteMany({ manualExamId: existing._id });
    await existing.deleteOne();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/teachers/manual-exams error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
