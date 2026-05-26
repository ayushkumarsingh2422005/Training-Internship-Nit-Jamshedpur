const STORAGE_KEY = "nit_dhte_student_session";

export function saveStudentSession(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* private browsing / quota */
  }
}

export function getStudentSession(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearStudentSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function authHeaders(): HeadersInit {
  const token = getStudentSession();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
