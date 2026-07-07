type TestLean = {
  durationMinutes: number;
  startDateTime: Date;
  endDateTime: Date;
};

type AccessLike = {
  startedAt?: Date | null;
};

export type ExamTimeState = {
  timeLeftSeconds: number;
  personalExpired: boolean;
  windowClosed: boolean;
  windowNotStarted: boolean;
};

export function getExamTimeState(
  test: TestLean,
  access: AccessLike,
  now: Date = new Date(),
): ExamTimeState {
  const start = new Date(test.startDateTime);
  const end = new Date(test.endDateTime);
  const windowNotStarted = now < start;
  const windowClosed = now > end;

  if (!access.startedAt) {
    return {
      timeLeftSeconds: test.durationMinutes * 60,
      personalExpired: false,
      windowClosed,
      windowNotStarted,
    };
  }

  const testDurationMs = test.durationMinutes * 60 * 1000;
  const individualEndTime = new Date(access.startedAt.getTime() + testDurationMs);
  const finalEndTime = end < individualEndTime ? end : individualEndTime;
  const timeLeftSeconds = Math.max(0, Math.floor((finalEndTime.getTime() - now.getTime()) / 1000));

  return {
    timeLeftSeconds,
    personalExpired: timeLeftSeconds <= 0,
    windowClosed,
    windowNotStarted,
  };
}

export function isExamTimeExpired(test: TestLean, access: AccessLike, now?: Date) {
  const state = getExamTimeState(test, access, now);
  return state.personalExpired || state.windowClosed;
}
