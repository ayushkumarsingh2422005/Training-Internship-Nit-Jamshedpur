import { NextResponse } from "next/server";
import { toAdminApplication } from "@/lib/admin-application";
import {
  buildAdminApplicationFilter,
  parseAdminApplicationFilterParams,
} from "@/lib/admin-application-filter";
import { adminApplicationsToCsv } from "@/lib/admin-applications-csv";
import { getAdminSessionFromRequest } from "@/lib/admin-session";
import connectDB from "@/lib/mongodb";
import Application from "@/models/Application";

const MAX_CSV_EXPORT = 20_000;

export async function GET(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterParams = parseAdminApplicationFilterParams(searchParams);
    const filter = buildAdminApplicationFilter(filterParams);
    const exportCsv = searchParams.get("export") === "csv";
    const exportIdCards = searchParams.get("export") === "idcards";
    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), 200);

    await connectDB();

    if (exportCsv || exportIdCards) {
      const total = await Application.countDocuments(filter);
      if (total > MAX_CSV_EXPORT) {
        return NextResponse.json(
          {
            error: `Too many records (${total}). Narrow your filters or contact support (max ${MAX_CSV_EXPORT}).`,
          },
          { status: 400 },
        );
      }

      const items = await Application.find(filter).sort({ fullName: 1 }).lean();

      if (exportIdCards) {
        return NextResponse.json({
          total,
          items: items.map((doc) => toAdminApplication(doc)),
        });
      }

      const csv = adminApplicationsToCsv(items.map((doc) => toAdminApplication(doc)));
      const date = new Date().toISOString().slice(0, 10);

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="students-${date}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const skip = (page - 1) * limit;

    const [items, total, subjects, subparts, hostelYes, hostelNo, hostelUnset, laptopYes, laptopNo, laptopUnset] =
      await Promise.all([
        Application.find(filter).sort({ fullName: 1 }).skip(skip).limit(limit).lean(),
        Application.countDocuments(filter),
        Application.distinct("subject"),
        Application.distinct("subpart"),
        Application.countDocuments({ ...filter, wantsAccommodation: true }),
        Application.countDocuments({ ...filter, wantsAccommodation: false }),
        Application.countDocuments({ ...filter, wantsAccommodation: null }),
        Application.countDocuments({ ...filter, hasLaptop: true }),
        Application.countDocuments({ ...filter, hasLaptop: false }),
        Application.countDocuments({ ...filter, hasLaptop: null }),
      ]);

    return NextResponse.json({
      total,
      page,
      limit,
      items: items.map((doc) => toAdminApplication(doc)),
      filters: {
        subjects: subjects.filter(Boolean).sort(),
        subparts: subparts.filter(Boolean).sort(),
      },
      stats: {
        hostelYes,
        hostelNo,
        hostelUnset,
        laptopYes,
        laptopNo,
        laptopUnset,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/applications", error);
    return NextResponse.json({ error: "Failed to load applications." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ error: "Application id is required." }, { status: 400 });
    }

    await connectDB();
    const deleted = await Application.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/applications", error);
    return NextResponse.json({ error: "Failed to delete application." }, { status: 500 });
  }
}
