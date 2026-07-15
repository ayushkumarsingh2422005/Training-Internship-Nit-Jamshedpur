import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Application from "@/models/Application";
import TestResult from "@/models/TestResult";
import ManualExamResult from "@/models/ManualExamResult";

export type MinistryReportRow = {
  studentId: string;
  internId: string | null;
  fullName: string;
  fatherName: string;
  email: string;
  phoneNumber: string;
  collegeName: string;
  collegeRegistrationNumber: string | null;
  subject: string;
  subpart: string;
  gender: string | null;
  examCount: number;
  cbtCount: number;
  manualCount: number;
  totalGot: number;
  totalMax: number;
  overallPercentage: number;
};

type ScoreAggregate = {
  _id: mongoose.Types.ObjectId;
  count: number;
  totalGot: number;
  totalMax: number;
};

function mergeScoreMap(
  target: Map<string, { cbtCount: number; manualCount: number; totalGot: number; totalMax: number }>,
  rows: ScoreAggregate[],
  source: "cbt" | "manual",
) {
  for (const row of rows) {
    const id = row._id.toString();
    const existing = target.get(id) ?? {
      cbtCount: 0,
      manualCount: 0,
      totalGot: 0,
      totalMax: 0,
    };

    if (source === "cbt") {
      existing.cbtCount += row.count;
    } else {
      existing.manualCount += row.count;
    }
    existing.totalGot += row.totalGot;
    existing.totalMax += row.totalMax;
    target.set(id, existing);
  }
}

export async function fetchMinistryReportRows(): Promise<MinistryReportRow[]> {
  await connectDB();

  const [cbtScores, manualScores] = await Promise.all([
    TestResult.aggregate<ScoreAggregate>([
      {
        $lookup: {
          from: "tests",
          localField: "testId",
          foreignField: "_id",
          as: "test",
        },
      },
      { $unwind: "$test" },
      {
        $group: {
          _id: "$studentId",
          count: { $sum: 1 },
          totalGot: { $sum: "$totalScore" },
          totalMax: { $sum: { $ifNull: ["$test.totalMarks", 0] } },
        },
      },
    ]),
    ManualExamResult.aggregate<ScoreAggregate>([
      {
        $lookup: {
          from: "manual_exams",
          localField: "manualExamId",
          foreignField: "_id",
          as: "exam",
        },
      },
      { $unwind: "$exam" },
      {
        $group: {
          _id: "$studentId",
          count: { $sum: 1 },
          totalGot: { $sum: "$score" },
          totalMax: { $sum: { $ifNull: ["$exam.maxMarks", 0] } },
        },
      },
    ]),
  ]);

  const scoreByStudent = new Map<
    string,
    { cbtCount: number; manualCount: number; totalGot: number; totalMax: number }
  >();

  mergeScoreMap(scoreByStudent, cbtScores, "cbt");
  mergeScoreMap(scoreByStudent, manualScores, "manual");

  const eligibleStudentIds = [...scoreByStudent.entries()]
    .filter(([, scores]) => scores.cbtCount + scores.manualCount >= 1)
    .map(([studentId]) => studentId);

  if (eligibleStudentIds.length === 0) return [];

  const applications = await Application.find({
    _id: { $in: eligibleStudentIds.map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .select(
      "internId fullName fatherName email phoneNumber collegeName collegeRegistrationNumber subject subpart gender",
    )
    .sort({ fullName: 1 })
    .lean();

  const rows: MinistryReportRow[] = [];

  for (const app of applications) {
    const studentId = app._id.toString();
    const scores = scoreByStudent.get(studentId);
    if (!scores || scores.cbtCount + scores.manualCount < 1) continue;

    const examCount = scores.cbtCount + scores.manualCount;
    const overallPercentage =
      scores.totalMax > 0 ? Math.round((scores.totalGot / scores.totalMax) * 10000) / 100 : 0;

    rows.push({
      studentId,
      internId: app.internId?.trim() || null,
      fullName: app.fullName,
      fatherName: app.fatherName,
      email: app.email,
      phoneNumber: app.phoneNumber,
      collegeName: app.collegeName,
      collegeRegistrationNumber: app.collegeRegistrationNumber?.trim() || null,
      subject: app.subject,
      subpart: app.subpart,
      gender: app.gender?.trim() || null,
      examCount,
      cbtCount: scores.cbtCount,
      manualCount: scores.manualCount,
      totalGot: scores.totalGot,
      totalMax: scores.totalMax,
      overallPercentage,
    });
  }

  return rows;
}
