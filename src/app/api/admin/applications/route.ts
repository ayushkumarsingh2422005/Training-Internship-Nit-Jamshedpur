import { NextResponse } from "next/server";
import { toAdminApplication } from "@/lib/admin-application";
import { getAdminSessionFromRequest } from "@/lib/admin-session";
import connectDB from "@/lib/mongodb";
import Application from "@/models/Application";

export async function GET(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const subject = searchParams.get("subject")?.trim() ?? "";
    const subpart = searchParams.get("subpart")?.trim() ?? "";
    const accommodation = searchParams.get("accommodation") ?? "";
    const laptop = searchParams.get("laptop") ?? "";
    const gender = searchParams.get("gender")?.trim() ?? "";
    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), 200);

    const filter: Record<string, unknown> = {};

    if (subject) filter.subject = subject;
    if (subpart) filter.subpart = subpart;
    if (gender) filter.gender = gender;

    if (accommodation === "yes") filter.wantsAccommodation = true;
    else if (accommodation === "no") filter.wantsAccommodation = false;
    else if (accommodation === "unset") filter.wantsAccommodation = null;
    if (laptop === "yes") filter.hasLaptop = true;
    else if (laptop === "no") filter.hasLaptop = false;
    else if (laptop === "unset") filter.hasLaptop = null;

    if (q) {
      const regex = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      filter.$or = [
        { fullName: regex },
        { fatherName: regex },
        { email: regex },
        { phoneNumber: regex },
        { collegeName: regex },
        { schoolName: regex },
        { address: regex },
      ];
    }

    await connectDB();

    const skip = (page - 1) * limit;

    const [items, total, subjects, subparts, hostelYes, hostelNo, hostelUnset, laptopYes, laptopNo, laptopUnset] = await Promise.all([
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
