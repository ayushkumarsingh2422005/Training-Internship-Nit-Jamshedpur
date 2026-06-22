import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Teacher from "@/models/Teacher";
import { createTeacherSessionToken, verifyTeacherSessionToken } from "@/lib/teacher-session";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let email = normalizeEmail(body.email || "");
    let phoneNumber = normalizePhone(body.phoneNumber || "");

    await connectDB();

    if (body.autoAuthToken) {
      const payload = await verifyTeacherSessionToken(body.autoAuthToken);
      if (payload) {
        email = normalizeEmail(payload.email);
        phoneNumber = normalizePhone(payload.phoneNumber);
      } else {
        return NextResponse.json({ authenticated: false, error: "Invalid session token." }, { status: 401 });
      }
    }

    if (!email || !phoneNumber) {
      return NextResponse.json({ error: "Email and phone number are required." }, { status: 400 });
    }

    // Force clear any stale HTTP-only cookie on fresh logins
    if (!body.autoAuthToken) {
      const cookieStore = await cookies();
      cookieStore.set("teacher_session", "", { maxAge: 0, path: "/" });
    }

    const teacher = await Teacher.findOne({ email, phoneNumber }).lean();

    if (!teacher) {
      return NextResponse.json({ authenticated: false, error: "Teacher credentials not found." }, { status: 401 });
    }

    const token = body.autoAuthToken || (await createTeacherSessionToken(email, phoneNumber));

    return NextResponse.json({
      authenticated: true,
      token,
      teacher: {
        id: teacher._id,
        fullName: teacher.fullName,
        email: teacher.email,
        assignedModules: teacher.assignedModules
      }
    });

  } catch (error) {
    console.error("POST /api/teachers/lookup", error);
    return NextResponse.json({ error: "Unable to authenticate teacher." }, { status: 500 });
  }
}
