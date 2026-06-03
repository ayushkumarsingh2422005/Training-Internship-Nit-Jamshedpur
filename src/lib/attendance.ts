export const ATTENDANCE_SESSION_TYPES = ["theory", "lab"] as const;

export type AttendanceSessionType = (typeof ATTENDANCE_SESSION_TYPES)[number];

export const ATTENDANCE_STATUSES = ["present", "absent"] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export type AttendanceRecordInput = {
  applicationId: string;
  status: AttendanceStatus;
};

export type AttendanceStudentRow = {
  id: string;
  internId: string | null;
  fullName: string;
  email: string;
  phoneNumber: string;
  collegeName: string;
  status: AttendanceStatus | null;
};

export type AttendanceSessionSummary = {
  id: string;
  date: string;
  module: string;
  sessionType: AttendanceSessionType;
  topic: string;
  presentCount: number;
  absentCount: number;
  totalCount: number;
  updatedAt: string | null;
};

export type StudentAttendanceEntry = {
  id: string;
  date: string;
  sessionType: AttendanceSessionType;
  topic: string;
  status: AttendanceStatus;
};

export type StudentAttendanceSummary = {
  module: string;
  theory: {
    present: number;
    absent: number;
    total: number;
    percentage: number;
  };
  lab: {
    present: number;
    absent: number;
    total: number;
    percentage: number;
  };
  entries: StudentAttendanceEntry[];
};

export function isAttendanceSessionType(value: string): value is AttendanceSessionType {
  return (ATTENDANCE_SESSION_TYPES as readonly string[]).includes(value);
}

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (ATTENDANCE_STATUSES as readonly string[]).includes(value);
}

export function attendancePercentage(present: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((present / total) * 100);
}

export function summarizeAttendanceCounts(records: { status: AttendanceStatus }[]) {
  const presentCount = records.filter((record) => record.status === "present").length;
  const absentCount = records.length - presentCount;
  return {
    presentCount,
    absentCount,
    totalCount: records.length,
  };
}

export function formatAttendanceSessionLabel(sessionType: AttendanceSessionType): string {
  return sessionType === "theory" ? "Theory" : "Lab";
}

/** Training calendar window shown to students. */
export const COURSE_CALENDAR_START = "2026-05-01";
export const COURSE_CALENDAR_END = "2026-07-31";

export const COURSE_CALENDAR_MONTHS = [
  { year: 2026, month: 5, label: "May 2026" },
  { year: 2026, month: 6, label: "June 2026" },
  { year: 2026, month: 7, label: "July 2026" },
  { year: 2026, month: 8, label: "August 2026" },
] as const;

export type DayAttendance = {
  theory?: AttendanceStatus;
  lab?: AttendanceStatus;
  theoryTopic?: string;
  labTopic?: string;
};

export function isWithinCourseCalendar(date: string): boolean {
  return date >= COURSE_CALENDAR_START && date <= COURSE_CALENDAR_END;
}

export function buildAttendanceByDate(
  entries: StudentAttendanceEntry[],
): Map<string, DayAttendance> {
  const map = new Map<string, DayAttendance>();

  for (const entry of entries) {
    const current = map.get(entry.date) ?? {};
    if (entry.sessionType === "theory") {
      current.theory = entry.status;
      current.theoryTopic = entry.topic;
    } else {
      current.lab = entry.status;
      current.labTopic = entry.topic;
    }
    map.set(entry.date, current);
  }

  return map;
}

export function formatCalendarDayKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Weeks for a month grid (Mon–Sun). Null = empty padding cell. */
export function getMonthWeeks(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (number | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export function dayAttendanceTooltipLines(day: DayAttendance): { label: string; topic: string; status: AttendanceStatus }[] {
  const lines: { label: string; topic: string; status: AttendanceStatus }[] = [];
  if (day.theory) {
    lines.push({
      label: "Theory",
      topic: day.theoryTopic?.trim() || "No topic recorded",
      status: day.theory,
    });
  }
  if (day.lab) {
    lines.push({
      label: "Lab",
      topic: day.labTopic?.trim() || "No topic recorded",
      status: day.lab,
    });
  }
  return lines;
}

export function dayAttendanceTitle(day: DayAttendance): string {
  return dayAttendanceTooltipLines(day)
    .map((line) => `${line.label} (${line.status}): ${line.topic}`)
    .join("\n");
}
