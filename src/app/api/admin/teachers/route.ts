import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import Teacher from "@/models/Teacher";

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  return !!token;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const teachers = await Teacher.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ teachers });
  } catch (error) {
    console.error("GET /api/admin/teachers", error);
    return NextResponse.json({ error: "Failed to fetch teachers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    await connectDB();

    const existing = await Teacher.findOne({
      $or: [{ email: body.email.toLowerCase() }, { phoneNumber: body.phoneNumber }],
    });

    if (existing) {
      return NextResponse.json(
        { error: "Teacher with this email or phone number already exists." },
        { status: 400 }
      );
    }

    const newTeacher = await Teacher.create({
      fullName: body.fullName,
      email: body.email,
      phoneNumber: body.phoneNumber,
      assignedModules: body.assignedModules || [],
    });

    return NextResponse.json({ teacher: newTeacher }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/teachers", error);
    return NextResponse.json({ error: "Failed to create teacher." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    await connectDB();

    const { id, ...updateData } = body;
    const updated = await Teacher.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updated) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json({ teacher: updated });
  } catch (error) {
    console.error("PATCH /api/admin/teachers", error);
    return NextResponse.json({ error: "Failed to update teacher." }, { status: 500 });
  }
}
