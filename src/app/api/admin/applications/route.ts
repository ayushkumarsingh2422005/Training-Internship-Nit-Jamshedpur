import { NextResponse } from "next/server";
import { toAdminApplication } from "@/lib/admin-application";
import {
  buildAdminApplicationFilter,
  parseAdminApplicationFilterParams,
} from "@/lib/admin-application-filter";
import { adminApplicationsToCsv } from "@/lib/admin-applications-csv";
import { isValidAadhar, normalizeAadhar } from "@/lib/profile";
import { getAdminSessionFromRequest } from "@/lib/admin-session";
import { formatInternId, nextInternIdSequence } from "@/lib/intern-id";
import connectDB from "@/lib/mongodb";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";
import Application from "@/models/Application";
import { normalizeGender } from "@/lib/gender";

const MAX_CSV_EXPORT = 20_000;

type AdminApplicationInput = {
  fullName?: string;
  fatherName?: string;
  schoolName?: string;
  collegeName?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  subject?: string;
  subpart?: string;
  wantsAccommodation?: boolean | null;
  gender?: string | null;
  aadharNumber?: string | null;
  collegeRegistrationNumber?: string | null;
  hasLaptop?: boolean | null;
};

type BulkCreatePayload = {
  application?: AdminApplicationInput;
  applications?: AdminApplicationInput[];
};

type UpdatePayload = {
  id?: string;
  application?: Partial<AdminApplicationInput>;
};

type NormalizedApplicationData = {
  fullName: string;
  fatherName: string;
  schoolName: string;
  collegeName: string;
  address: string;
  phoneNumber: string;
  email: string;
  subject: string;
  subpart: string;
  wantsAccommodation: boolean | null;
  gender: "Male" | "Female" | "Other" | null;
  aadharNumber: string | null;
  collegeRegistrationNumber: string | null;
  hasLaptop: boolean | null;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableBoolean(value: unknown): boolean | null {
  if (value === true || value === false) return value;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "true" || lower === "yes") return true;
    if (lower === "false" || lower === "no") return false;
  }
  return null;
}

function validateAndNormalizeApplicationInput(
  input: AdminApplicationInput,
): { ok: true; value: NormalizedApplicationData } | { ok: false; error: string } {
  const fullName = clean(input.fullName);
  const fatherName = clean(input.fatherName);
  const schoolName = clean(input.schoolName);
  const collegeName = clean(input.collegeName);
  const address = clean(input.address);
  const email = normalizeEmail(clean(input.email));
  const phoneNumber = normalizePhone(clean(input.phoneNumber));
  const subject = clean(input.subject);
  const subpart = clean(input.subpart);
  const wantsAccommodation = normalizeNullableBoolean(input.wantsAccommodation);
  const hasLaptop = normalizeNullableBoolean(input.hasLaptop);
  const genderValue = clean(input.gender);
  const gender = genderValue ? normalizeGender(genderValue) : null;
  const aadhar = normalizeAadhar(clean(input.aadharNumber));
  const collegeRegistrationNumber = clean(input.collegeRegistrationNumber);

  if (!fullName) return { ok: false, error: "Full name is required." };
  if (!fatherName) return { ok: false, error: "Father/guardian name is required." };
  if (!schoolName) return { ok: false, error: "School name is required." };
  if (!collegeName) return { ok: false, error: "College name is required." };
  if (!address) return { ok: false, error: "Address is required." };
  if (!subject) return { ok: false, error: "Branch is required." };
  if (!subpart) return { ok: false, error: "Module is required." };
  if (!email || !email.includes("@")) return { ok: false, error: "A valid email is required." };
  if (phoneNumber.length !== 10) return { ok: false, error: "A valid 10-digit phone number is required." };
  if (genderValue && !gender) return { ok: false, error: "Gender must be Male, Female, or Other." };
  if (aadhar && !isValidAadhar(aadhar)) {
    return { ok: false, error: "Aadhaar number must be 12 digits." };
  }

  return {
    ok: true,
    value: {
      fullName,
      fatherName,
      schoolName,
      collegeName,
      address,
      phoneNumber,
      email,
      subject,
      subpart,
      wantsAccommodation,
      gender,
      aadharNumber: aadhar || null,
      collegeRegistrationNumber: collegeRegistrationNumber || null,
      hasLaptop,
    },
  };
}

async function nextInternIds(count: number): Promise<string[]> {
  if (count <= 0) return [];

  const rows = await Application.find({ internId: { $ne: null } })
    .select({ internId: 1, _id: 0 })
    .lean();
  let sequence = nextInternIdSequence(rows.map((row) => row.internId));

  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    ids.push(formatInternId(sequence));
    sequence += 1;
  }
  return ids;
}

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

export async function POST(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as BulkCreatePayload;
    const rawApplications = Array.isArray(body.applications)
      ? body.applications
      : body.application
        ? [body.application]
        : [];

    if (!rawApplications.length) {
      return NextResponse.json({ error: "At least one application is required." }, { status: 400 });
    }

    if (rawApplications.length > 1000) {
      return NextResponse.json({ error: "Bulk add supports up to 1000 records per request." }, { status: 400 });
    }

    const normalized: NormalizedApplicationData[] = [];
    for (let i = 0; i < rawApplications.length; i += 1) {
      const checked = validateAndNormalizeApplicationInput(rawApplications[i] ?? {});
      if (!checked.ok) {
        return NextResponse.json(
          { error: `Row ${i + 1}: ${checked.error}` },
          { status: 400 },
        );
      }
      normalized.push(checked.value);
    }

    const seen = new Set<string>();
    for (const item of normalized) {
      if (seen.has(item.email)) {
        return NextResponse.json(
          { error: `Duplicate email in upload: ${item.email}` },
          { status: 400 },
        );
      }
      seen.add(item.email);
    }

    await connectDB();

    const existing = await Application.find({ email: { $in: Array.from(seen) } })
      .select({ email: 1, _id: 0 })
      .lean();
    if (existing.length > 0) {
      const first = existing[0]?.email ?? "unknown";
      return NextResponse.json(
        { error: `Email already exists: ${first}` },
        { status: 409 },
      );
    }

    const internIds = await nextInternIds(normalized.length);
    const docs = normalized.map((item, index) => ({
      ...item,
      internId: internIds[index],
    }));

    const created = await Application.insertMany(docs, { ordered: true });

    return NextResponse.json({
      success: true,
      created: created.length,
      items: created.map((doc) => toAdminApplication(doc.toObject())),
    });
  } catch (error) {
    console.error("POST /api/admin/applications", error);
    return NextResponse.json({ error: "Failed to add applications." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as UpdatePayload;
    const id = clean(body.id);
    if (!id) {
      return NextResponse.json({ error: "Application id is required." }, { status: 400 });
    }

    const checked = validateAndNormalizeApplicationInput(body.application ?? {});
    if (!checked.ok) {
      return NextResponse.json({ error: checked.error }, { status: 400 });
    }

    await connectDB();
    const existing = await Application.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const internId = existing.internId?.trim() ? existing.internId : (await nextInternIds(1))[0];
    const updated = await Application.findByIdAndUpdate(
      id,
      { $set: { ...checked.value, internId } },
      { new: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      item: toAdminApplication(updated),
    });
  } catch (error) {
    console.error("PATCH /api/admin/applications", error);
    return NextResponse.json({ error: "Failed to update application." }, { status: 500 });
  }
}
