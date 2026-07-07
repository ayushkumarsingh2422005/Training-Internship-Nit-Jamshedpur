export type GradingQuestion = {
  _id: string;
  questionType: string;
  options?: { _id: string; isCorrect?: boolean }[];
  correctIntegerAnswer?: number | null;
  marks: number;
  negativeMarks: number;
};

export function computePreviewScore(
  gradingQuestions: GradingQuestion[],
  answers: Record<string, unknown>,
  isNegativeMarking: boolean,
) {
  let totalScore = 0;
  let correctQuestions = 0;
  let incorrectQuestions = 0;
  let unattemptedQuestions = 0;

  for (const q of gradingQuestions) {
    const studentAns = answers[q._id];
    let isCorrect = false;
    let isAttempted = false;

    if (q.questionType === "Single Correct") {
      if (studentAns !== undefined && studentAns !== "") {
        isAttempted = true;
        const correctOption = q.options?.find((opt) => opt.isCorrect);
        if (correctOption && correctOption._id.toString() === String(studentAns)) {
          isCorrect = true;
        }
      }
    } else if (q.questionType === "Multiple Correct") {
      if (Array.isArray(studentAns) && studentAns.length > 0) {
        isAttempted = true;
        const correctOptionIds = (q.options ?? [])
          .filter((opt) => opt.isCorrect)
          .map((opt) => opt._id.toString());
        const studentIds = studentAns.map(String);
        const matchesAll =
          correctOptionIds.length === studentIds.length &&
          studentIds.every((id) => correctOptionIds.includes(id));
        if (matchesAll) isCorrect = true;
      }
    } else if (q.questionType === "Integer Type") {
      if (studentAns !== undefined && studentAns !== null && studentAns !== "") {
        isAttempted = true;
        if (q.correctIntegerAnswer === Number(studentAns)) {
          isCorrect = true;
        }
      }
    }

    if (!isAttempted) {
      unattemptedQuestions++;
    } else if (isCorrect) {
      correctQuestions++;
      totalScore += q.marks;
    } else {
      incorrectQuestions++;
      if (isNegativeMarking) {
        totalScore -= q.negativeMarks;
      }
    }
  }

  const attemptedCount = correctQuestions + incorrectQuestions;
  const accuracyPercentage =
    attemptedCount > 0 ? Math.round((correctQuestions / attemptedCount) * 100) : 0;

  return {
    totalScore,
    correctQuestions,
    incorrectQuestions,
    unattemptedQuestions,
    accuracyPercentage,
  };
}
