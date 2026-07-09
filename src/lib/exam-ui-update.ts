export const EXAM_UI_UPDATE_POLL_MS = 60_000;
export const EXAM_UI_RELOAD_PROCTOR_GRACE_MS = 8_000;

export function getExamUiReloadStorageKey(studentHash: string, secureToken: string) {
  return `exam_ui_reload_${studentHash}_${secureToken}`;
}

export async function fetchAppVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/app-version.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    const version = data.version?.trim();
    return version || null;
  } catch {
    return null;
  }
}
