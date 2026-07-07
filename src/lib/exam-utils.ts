/** Fisher-Yates shuffle (returns a new array). */
export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Deterministic shuffle — same seed yields same order (for preview consistency). */
export function seededShuffleArray<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const random = () => {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    return hash / 0x100000000;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const PROCTOR_TAB_WARN_THRESHOLD = 3;
export const PROCTOR_FOCUS_WARN_THRESHOLD = 5;

export function isProctorFlagged(tabSwitches: number, focusLosses: number): boolean {
  return (
    tabSwitches >= PROCTOR_TAB_WARN_THRESHOLD ||
    focusLosses >= PROCTOR_FOCUS_WARN_THRESHOLD
  );
}

export function getProctorWarningMessage(tabSwitches: number, focusLosses: number): string | null {
  const parts: string[] = [];
  if (tabSwitches >= PROCTOR_TAB_WARN_THRESHOLD) {
    parts.push(`${tabSwitches} tab switch${tabSwitches === 1 ? "" : "es"}`);
  }
  if (focusLosses >= PROCTOR_FOCUS_WARN_THRESHOLD) {
    parts.push(`${focusLosses} focus loss${focusLosses === 1 ? "" : "es"}`);
  }
  if (parts.length === 0) return null;
  return `Proctoring: ${parts.join(", ")}. Repeated violations may invalidate your attempt.`;
}

export type QuestionTiming = { questionId: string; elapsedSeconds: number };

export function getQuestionElapsed(
  timings: QuestionTiming[] | undefined,
  questionId: string,
): number {
  return timings?.find((t) => t.questionId === questionId)?.elapsedSeconds ?? 0;
}

export function getQuestionRemainingSeconds(
  limitSeconds: number,
  timings: QuestionTiming[] | undefined,
  questionId: string,
  sessionStartMs?: number,
): number {
  if (limitSeconds <= 0) return 0;
  let elapsed = getQuestionElapsed(timings, questionId);
  if (sessionStartMs) {
    elapsed += Math.floor((Date.now() - sessionStartMs) / 1000);
  }
  return Math.max(0, limitSeconds - Math.min(elapsed, limitSeconds));
}

export function isQuestionTimeExpired(
  limitSeconds: number,
  timings: QuestionTiming[] | undefined,
  questionId: string,
  sessionStartMs?: number,
): boolean {
  if (limitSeconds <= 0) return false;
  return getQuestionRemainingSeconds(limitSeconds, timings, questionId, sessionStartMs) <= 0;
}

export function upsertQuestionTiming(
  timings: QuestionTiming[],
  questionId: string,
  elapsedSeconds: number,
): QuestionTiming[] {
  const idx = timings.findIndex((t) => t.questionId === questionId);
  if (idx >= 0) {
    const next = [...timings];
    next[idx] = { questionId, elapsedSeconds };
    return next;
  }
  return [...timings, { questionId, elapsedSeconds }];
}

/** Block refresh, devtools, view-source, print, and similar shortcuts during CBT. */
export function shouldBlockExamShortcut(event: KeyboardEvent): boolean {
  const key = event.key;
  const keyLower = key.toLowerCase();
  const mod = event.ctrlKey || event.metaKey;

  if (/^F(1[0-2]|[1-9])$/i.test(key)) return true;

  if (mod && event.shiftKey && ["i", "j", "c", "k", "r", "delete"].includes(keyLower)) {
    return true;
  }

  if (mod && !event.altKey) {
    if (["r", "s", "p", "u", "w", "n", "t", "g", "h"].includes(keyLower)) return true;
  }

  if (event.altKey && (keyLower === "arrowleft" || keyLower === "arrowright")) return true;

  return false;
}

