import type { AdminApplication } from "@/lib/admin-application";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function triStateLabel(value: boolean | null | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not set";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

const CSV_HEADERS = [
  "Full Name",
  "Father / Guardian",
  "Email",
  "Mobile",
  "School",
  "College",
  "College Registration No.",
  "Aadhaar",
  "Address",
  "Branch",
  "Module",
  "Hostel",
  "Gender",
  "Laptop",
  "Registered",
] as const;

export function adminApplicationsToCsv(items: AdminApplication[]): string {
  const rows = items.map((app) => [
    app.fullName,
    app.fatherName,
    app.email,
    app.phoneNumber,
    app.schoolName,
    app.collegeName,
    app.collegeRegistrationNumber ?? "",
    app.aadharNumber ?? "",
    app.address,
    app.subject,
    app.subpart,
    triStateLabel(app.wantsAccommodation),
    app.gender?.trim() ?? "",
    triStateLabel(app.hasLaptop),
    formatDate(app.createdAt),
  ]);

  const lines = [
    CSV_HEADERS.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(String(cell ?? ""))).join(",")),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}
