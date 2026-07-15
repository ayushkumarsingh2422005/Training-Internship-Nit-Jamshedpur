import { NextResponse } from "next/server";
import { ministryReportToCsv } from "@/lib/admin-ministry-results-csv";
import { getAdminSessionFromRequest } from "@/lib/admin-session";
import { fetchMinistryReportRows } from "@/lib/student-consolidated-results";

export async function GET(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await fetchMinistryReportRows();
    const csv = ministryReportToCsv(rows);
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ministry-exam-results-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/admin/exams/ministry-report error:", error);
    return NextResponse.json({ error: "Failed to generate ministry report." }, { status: 500 });
  }
}
