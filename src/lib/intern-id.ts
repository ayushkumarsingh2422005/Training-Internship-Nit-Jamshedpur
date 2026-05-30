export const INTERN_ID_PREFIX = "NIT-INT26-";
export const INTERN_ID_START = 1000;

const INTERN_ID_PATTERN = /^NIT-INT26-(\d{4,})$/;

export function formatInternId(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < INTERN_ID_START) {
    throw new Error(`Intern ID sequence must be an integer >= ${INTERN_ID_START}`);
  }
  return `${INTERN_ID_PREFIX}${sequence}`;
}

export function parseInternIdSequence(internId: string | null | undefined): number | null {
  const trimmed = internId?.trim();
  if (!trimmed) return null;

  const match = trimmed.match(INTERN_ID_PATTERN);
  if (!match) return null;

  const sequence = Number.parseInt(match[1], 10);
  return Number.isNaN(sequence) ? null : sequence;
}

export function maxInternIdSequence(internIds: Array<string | null | undefined>): number | null {
  let max: number | null = null;

  for (const internId of internIds) {
    const sequence = parseInternIdSequence(internId);
    if (sequence == null) continue;
    if (max == null || sequence > max) max = sequence;
  }

  return max;
}

export function nextInternIdSequence(internIds: Array<string | null | undefined>): number {
  const max = maxInternIdSequence(internIds);
  return max == null ? INTERN_ID_START : max + 1;
}
