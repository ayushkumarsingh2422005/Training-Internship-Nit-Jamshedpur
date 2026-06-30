const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const PORTAL_TZ = "+05:30";

/** Format a stored Date for <input type="datetime-local"> using local browser time. */
export function toDateTimeLocalValue(value: string | Date): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert a datetime-local field value to UTC ISO using the user's browser timezone. */
export function dateTimeLocalToISO(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}

/** Parse API/datetime input into a Date (handles ISO and bare datetime-local as IST). */
export function parseDateTimeInput(value: string | Date): Date {
  if (value instanceof Date) return value;
  const trimmed = value.trim();
  if (!trimmed) return new Date(NaN);
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  if (DATETIME_LOCAL_RE.test(trimmed)) {
    const withSeconds = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
    return new Date(`${withSeconds}${PORTAL_TZ}`);
  }
  return new Date(trimmed);
}
