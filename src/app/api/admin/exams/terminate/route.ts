import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-session";
import { terminateExamAccess } from "@/lib/exam-terminate";

export async function POST(req: Request) {
  const session = await getAdminSessionFromRequest(req, ["admin"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const accessId = body?.accessId as string | undefined;
    if (!accessId) {
      return NextResponse.json({ error: "Missing accessId." }, { status: 400 });
    }

    const result = await terminateExamAccess(accessId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, alreadyTerminated: result.alreadyTerminated ?? false });
  } catch (error) {
    console.error("POST /api/admin/exams/terminate error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
