export type ExamSubmitResult = {
  totalScore: number;
  correctQuestions: number;
  incorrectQuestions: number;
  unattemptedQuestions: number;
  accuracyPercentage: number;
  autoSubmitted?: boolean;
};

export type ExamStudentProfile = {
  fullName: string;
  fatherName: string;
  internId: string | null;
  email: string;
  phoneNumber: string;
  collegeName: string;
  schoolName: string;
  subject: string;
  subpart: string;
  rollNumber: string | null;
};

export type ExamEntryTestInfo = {
  testName: string;
  subject: string;
  subpart: string;
  durationMinutes: number;
  totalMarks: number;
  isNegativeMarking: boolean;
  randomizeQuestions: boolean;
  instructions: string;
};

export const DEFAULT_EXAM_INSTRUCTIONS = `1. This is a Computer Based Test (CBT). Read every instruction carefully before you begin.

2. The examination will run in full-screen mode. Leaving full-screen will pause the test until you resume.

3. Tab switches and focus losses are recorded for proctoring. Avoid switching applications or browser tabs.

4. Your answers are saved automatically. Use the question palette to navigate between questions.

5. Click "Finish exam" only when you are ready to submit. Once submitted, you cannot re-enter the test.

6. For questions with a per-question time limit, the timer cannot be paused. Expired questions cannot be revisited.

7. Ensure a stable internet connection throughout the examination.`;

export function formatExamInstructions(instructions: string | undefined | null) {
  const trimmed = instructions?.trim();
  return trimmed || DEFAULT_EXAM_INSTRUCTIONS;
}
