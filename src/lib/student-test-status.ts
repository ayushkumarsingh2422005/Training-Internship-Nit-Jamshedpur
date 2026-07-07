export type ScheduleCategory = "ongoing" | "upcoming" | "completed";

export type StudentTestAccessStatus =
  | "Not Started"
  | "In Progress"
  | "Submitted"
  | "Terminated"
  | null;

export type StudentTestListItem = {
  _id: string;
  testName: string;
  subject: string;
  subpart: string;
  startDateTime: string | Date;
  endDateTime: string | Date;
  durationMinutes: number;
  totalMarks: number;
  scheduleCategory: ScheduleCategory;
  accessStatus: StudentTestAccessStatus;
  hasResult: boolean;
  totalScore: number | null;
  accuracyPercentage: number | null;
  canStart: boolean;
  canResume: boolean;
  canDownloadReport: boolean;
  attemptLabel: string;
};

type AccessLike = { status: string } | null | undefined;
type ResultLike = { totalScore: number; accuracyPercentage: number } | null | undefined;

export function enrichStudentTest(
  test: {
    _id: { toString(): string } | string;
    testName: string;
    subject: string;
    subpart: string;
    startDateTime: string | Date;
    endDateTime: string | Date;
    durationMinutes: number;
    totalMarks: number;
  },
  access: AccessLike,
  result: ResultLike,
  now: Date = new Date(),
): StudentTestListItem {
  const start = new Date(test.startDateTime);
  const end = new Date(test.endDateTime);

  let scheduleCategory: ScheduleCategory;
  if (now < start) scheduleCategory = "upcoming";
  else if (now > end) scheduleCategory = "completed";
  else scheduleCategory = "ongoing";

  const accessStatus = (access?.status as StudentTestAccessStatus) ?? null;
  const hasResult = Boolean(result);
  const isSubmitted = accessStatus === "Submitted" || hasResult;
  const isInProgress = accessStatus === "In Progress";
  const isTerminated = accessStatus === "Terminated";

  const canStart =
    scheduleCategory === "ongoing" && !isSubmitted && !isInProgress && !isTerminated;
  const canResume = scheduleCategory === "ongoing" && isInProgress && !isTerminated;
  const canDownloadReport = scheduleCategory === "completed" && hasResult;

  let attemptLabel: string;
  if (isSubmitted) {
    attemptLabel = "Submitted";
  } else if (isTerminated) {
    attemptLabel = "Terminated";
  } else if (isInProgress) {
    attemptLabel = "In progress";
  } else if (scheduleCategory === "upcoming") {
    attemptLabel = "Scheduled";
  } else if (scheduleCategory === "completed") {
    attemptLabel = "Not attempted";
  } else {
    attemptLabel = "Not started";
  }

  const testId = typeof test._id === "string" ? test._id : test._id.toString();

  return {
    _id: testId,
    testName: test.testName,
    subject: test.subject,
    subpart: test.subpart,
    startDateTime: test.startDateTime,
    endDateTime: test.endDateTime,
    durationMinutes: test.durationMinutes,
    totalMarks: test.totalMarks,
    scheduleCategory,
    accessStatus,
    hasResult,
    totalScore: result?.totalScore ?? null,
    accuracyPercentage: result?.accuracyPercentage ?? null,
    canStart,
    canResume,
    canDownloadReport,
    attemptLabel,
  };
}
