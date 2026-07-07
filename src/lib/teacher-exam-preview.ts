import { shuffleArray } from "@/lib/exam-utils";
import type { GradingQuestion } from "@/lib/exam-preview-score";

export const TEACHER_EXAM_PREVIEW_STORAGE_KEY = "teacher_exam_preview";

export type FormQuestionInput = {
  questionText: string;
  questionType: string;
  options?: { text: string; isCorrect: boolean }[];
  correctIntegerAnswer?: number | null | string;
  marks: number;
  negativeMarks: number;
  timeLimitSeconds: number;
};

export type TeacherExamPreviewPayload = {
  test: {
    testName: string;
    subject: string;
    subpart: string;
    durationMinutes: number;
    totalMarks: number;
    instructions: string;
    isNegativeMarking: boolean;
    randomizeQuestions: boolean;
  };
  student: {
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
  questions: FormQuestionInput[];
};

export type PreviewExamQuestion = {
  _id: string;
  questionType: string;
  questionText: string;
  options: { _id: string; text: string }[];
  marks: number;
  negativeMarks: number;
  timeLimitSeconds: number;
  type?: string;
};

export function saveDraftPreview(payload: TeacherExamPreviewPayload) {
  sessionStorage.setItem(TEACHER_EXAM_PREVIEW_STORAGE_KEY, JSON.stringify(payload));
}

export function loadDraftPreview(): TeacherExamPreviewPayload | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(TEACHER_EXAM_PREVIEW_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TeacherExamPreviewPayload;
  } catch {
    return null;
  }
}

export function normalizeDraftPreviewQuestions(
  formQuestions: FormQuestionInput[],
  randomize: boolean,
): { displayQuestions: PreviewExamQuestion[]; gradingQuestions: GradingQuestion[] } {
  let items = formQuestions.map((q, idx) => ({ q, idx }));
  if (randomize) {
    items = shuffleArray(items);
  }

  const displayQuestions: PreviewExamQuestion[] = [];
  const gradingQuestions: GradingQuestion[] = [];

  for (const { q, idx } of items) {
    const qId = `preview-q-${idx}`;
    const options = (q.options ?? []).map((o, j) => ({
      _id: `preview-q-${idx}-opt-${j}`,
      text: o.text,
    }));
    const gradingOptions = (q.options ?? []).map((o, j) => ({
      _id: `preview-q-${idx}-opt-${j}`,
      isCorrect: o.isCorrect,
    }));

    displayQuestions.push({
      _id: qId,
      questionType: q.questionType,
      questionText: q.questionText,
      options,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      timeLimitSeconds: q.timeLimitSeconds ?? 0,
      type: q.questionType,
    });

    gradingQuestions.push({
      _id: qId,
      questionType: q.questionType,
      options: q.questionType === "Integer Type" ? undefined : gradingOptions,
      correctIntegerAnswer:
        q.correctIntegerAnswer !== undefined &&
        q.correctIntegerAnswer !== null &&
        q.correctIntegerAnswer !== ""
          ? Number(q.correctIntegerAnswer)
          : null,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
    });
  }

  return { displayQuestions, gradingQuestions };
}
