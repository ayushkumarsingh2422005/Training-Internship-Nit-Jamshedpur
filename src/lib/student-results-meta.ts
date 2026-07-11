import { idCardMeta } from "@/lib/id-card-meta";

export type ResultsPdfExam = {
  id: string;
  source: "cbt" | "manual";
  examName: string;
  subject: string;
  subpart: string;
  examType: string;
  score: number;
  maxMarks: number;
  examDate: string | null;
  remarks: string;
  accuracyPercentage: number | null;
};

export type ResultsPdfSummary = {
  examCount: number;
  totalGot: number;
  totalMax: number;
  overallPercentage: number;
};

export type ResultsPdfStudent = {
  fullName: string;
  internId: string | null;
  email: string;
  phoneNumber: string;
  collegeName: string;
  subject: string;
  subpart: string;
};

export const resultsPdfMeta = {
  title: "Consolidated Result Statement",
  organization: idCardMeta.organization,
  tagline: idCardMeta.tagline,
  department: idCardMeta.department,
  issuerLine: idCardMeta.issuerLine,
  formulaNote:
    "Overall % = (Total Marks Obtained ÷ Total Maximum Marks) × 100, normalized out of 100.",
  componentsNote: "Includes CBT examinations and teacher-entered Theory / Lab marks.",
} as const;

export function resultsPdfFileName(student: ResultsPdfStudent): string {
  const slug = (student.internId || student.fullName || "student")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `result-${slug || "student"}.pdf`;
}

export function formatResultsPdfDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function examPercentage(score: number, maxMarks: number): number {
  if (!maxMarks || maxMarks <= 0) return 0;
  return Math.round((score / maxMarks) * 1000) / 10;
}
