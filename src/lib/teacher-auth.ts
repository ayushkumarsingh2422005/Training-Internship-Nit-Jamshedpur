import connectDB from "@/lib/mongodb";
import Teacher from "@/models/Teacher";
import { verifyTeacherSessionToken } from "@/lib/teacher-session";
import { modulesMatch } from "@/lib/module-match";

export async function getTeacherFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);
  const payload = await verifyTeacherSessionToken(token);
  if (!payload) return null;

  await connectDB();
  return await Teacher.findOne({ email: payload.email, phoneNumber: payload.phoneNumber });
}

export function teacherOwnsModule(
  teacher: { assignedModules?: { subject: string; subpart: string }[] },
  subject: string,
  subpart: string,
) {
  return (teacher.assignedModules ?? []).some((mod) => modulesMatch(mod, { subject, subpart }));
}
