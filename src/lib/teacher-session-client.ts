import Cookies from "js-cookie";

const TEACHER_SESSION_KEY = "teacher_session";

export function saveTeacherSession(token: string) {
  Cookies.set(TEACHER_SESSION_KEY, token, {
    expires: 7, // 7 days
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearTeacherSession() {
  Cookies.remove(TEACHER_SESSION_KEY);
}

export function getTeacherSession() {
  return Cookies.get(TEACHER_SESSION_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getTeacherSession();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
