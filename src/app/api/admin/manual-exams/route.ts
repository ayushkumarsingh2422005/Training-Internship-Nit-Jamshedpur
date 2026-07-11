import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ManualExam from "@/models/ManualExam";
import ManualExamResult from "@/models/ManualExamResult";
import Application from "@/models/Application";
import Teacher from "@/models/Teacher";
import { getAdminSessionFromRequest } from "@/lib/admin-session";

export async function GET(req: Request) {
  const session = await getAdminSessionFromRequest(req, ["admin"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const exam = await ManualExam.findById(id)
        .populate({ path: "createdBy", model: Teacher, select: "fullName email" })
        .lean();
      if (!exam) {
        return NextResponse.json({ error: "Manual exam not found" }, { status: 404 });
      }

      const results = await ManualExamResult.find({ manualExamId: exam._id })
        .populate({
          path: "studentId",
          model: Application,
          select: "fullName email internId collegeName",
        })
        .sort({ updatedAt: -1 })
        .lean();

      return NextResponse.json({ exam, results });
    }

    const exams = await ManualExam.find({})
      .populate({ path: "createdBy", model: Teacher, select: "fullName email" })
      .sort({ createdAt: -1 })
      .lean();

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
    console.error("GET /api/admin/manual-exams error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
