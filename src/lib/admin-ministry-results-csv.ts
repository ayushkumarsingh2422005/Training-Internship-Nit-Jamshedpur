import type { MinistryReportRow } from "@/lib/student-consolidated-results";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(Math.round(value * 100) / 100);
}

const CSV_HEADERS = [
  "Intern ID",
  "Full Name",
  "Father / Guardian",
  "Email",
  "Mobile",
  "College",
  "College Registration No.",
  "Branch",
  "Module",
  "Gender",
  "Exams Count",
  "CBT Exams",
  "Manual Exams",
  "Total Marks Obtained",
  "Total Max Marks",
  "Overall Percentage (%)",
] as const;

export function ministryReportToCsv(rows: MinistryReportRow[]): string {
  const lines = [
    CSV_HEADERS.map(escapeCsvCell).join(","),
    ...rows.map((row) =>
      [
        row.internId ?? "",
        row.fullName,
        row.fatherName,
        row.email,
        row.phoneNumber,
        row.collegeName,
        row.collegeRegistrationNumber ?? "",
        row.subject,
        row.subpart,
        row.gender?.trim() ?? "",
        row.examCount,
        row.cbtCount,
        row.manualCount,
        row.totalGot,
        row.totalMax,
        formatPercentage(row.overallPercentage),
      ]
        .map((cell) => escapeCsvCell(String(cell ?? "")))
        .join(","),
    ),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}
