function collapseSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Canonical module name: trim, unify slash spacing, collapse spaces. */
export function normalizeSubpart(value: string): string {
  return collapseSpaces(value).replace(/\s*\/\s*/g, " / ");
}

export function normalizeSubject(value: string): string {
  return collapseSpaces(value);
}

export function subpartVariants(value: string): string[] {
  const trimmed = value.trim();
  const canonical = normalizeSubpart(trimmed);
  const compact = canonical.replace(/ \/ /g, "/");
  return [...new Set([trimmed, canonical, compact])];
}

export function subjectVariants(value: string): string[] {
  const trimmed = value.trim();
  const canonical = normalizeSubject(trimmed);
  return trimmed === canonical ? [trimmed] : [...new Set([trimmed, canonical])];
}

export function modulesMatch(
  a: { subject: string; subpart: string },
  b: { subject: string; subpart: string },
): boolean {
  return (
    normalizeSubject(a.subject) === normalizeSubject(b.subject) &&
    normalizeSubpart(a.subpart) === normalizeSubpart(b.subpart)
  );
}

export function moduleQueryFilter(subject: string, subpart: string) {
  return {
    subject: { $in: subjectVariants(subject) },
    subpart: { $in: subpartVariants(subpart) },
  };
}
