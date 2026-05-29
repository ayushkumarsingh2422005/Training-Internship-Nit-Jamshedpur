import { NextResponse } from "next/server";
import { type NoticeCategory, toAdminNotice } from "@/lib/notices";
import { getAdminSessionFromRequest } from "@/lib/admin-session";
import { revalidatePublicNoticePages } from "@/lib/revalidate-public";
import connectDB from "@/lib/mongodb";
import Notice from "@/models/Notice";

export const dynamic = "force-dynamic";

type NoticePayload = {
  id?: string;
  title?: string;
  date?: string;
  category?: string;
  excerpt?: string;
  body?: string;
  isNew?: boolean;
  isPublished?: boolean;
};

function validatePayload(body: NoticePayload, mode: "create" | "update"): string | null {
  const requiredFields: Array<keyof NoticePayload> = ["title", "date", "category", "excerpt", "body"];
  if (mode === "create") {
    for (const key of requiredFields) {
      if (!body[key] || typeof body[key] !== "string" || !body[key]?.trim()) {
        return `Missing required field: ${key}`;
      }
    }
  }

  if (body.category) {
    const category = body.category.trim();
    if (!category) {
      return "Category cannot be empty.";
    }
    if (category.length > 60) {
      return "Category must be 60 characters or less.";
    }
  }

  if (body.date && Number.isNaN(new Date(body.date).getTime())) {
    return "Invalid notice date.";
  }

  return null;
}

async function ensureAdmin(request: Request) {
  if (!(await getAdminSessionFromRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const unauthorized = await ensureAdmin(request);
    if (unauthorized) return unauthorized;

    await connectDB();
    const docs = await Notice.find().sort({ date: -1, updatedAt: -1 }).lean();
    return NextResponse.json({ items: docs.map((doc) => toAdminNotice(doc)) });
  } catch (error) {
    console.error("GET /api/admin/notices", error);
    return NextResponse.json({ error: "Failed to load notices." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = await ensureAdmin(request);
    if (unauthorized) return unauthorized;

    const body = (await request.json()) as NoticePayload;
    const validationError = validatePayload(body, "create");
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await connectDB();
    const created = await Notice.create({
      title: body.title?.trim(),
      date: new Date(body.date as string),
      category: body.category?.trim() as NoticeCategory,
      excerpt: body.excerpt?.trim(),
      body: body.body?.trim(),
      isNew: Boolean(body.isNew),
      isPublished: body.isPublished ?? true,
    });

    revalidatePublicNoticePages();

    return NextResponse.json({ item: toAdminNotice(created.toObject()) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/notices", error);
    return NextResponse.json({ error: "Failed to create notice." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const unauthorized = await ensureAdmin(request);
    if (unauthorized) return unauthorized;

    const body = (await request.json()) as NoticePayload;
    if (!body.id) {
      return NextResponse.json({ error: "Notice id is required." }, { status: 400 });
    }
    const validationError = validatePayload(body, "update");
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (typeof body.title === "string") update.title = body.title.trim();
    if (typeof body.date === "string") update.date = new Date(body.date);
    if (typeof body.category === "string") update.category = body.category.trim() as NoticeCategory;
    if (typeof body.excerpt === "string") update.excerpt = body.excerpt.trim();
    if (typeof body.body === "string") update.body = body.body.trim();
    if (typeof body.isNew === "boolean") update.isNew = body.isNew;
    if (typeof body.isPublished === "boolean") update.isPublished = body.isPublished;

    await connectDB();
    const updated = await Notice.findByIdAndUpdate(body.id, { $set: update }, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ error: "Notice not found." }, { status: 404 });
    }

    revalidatePublicNoticePages();

    return NextResponse.json({ item: toAdminNotice(updated) });
  } catch (error) {
    console.error("PATCH /api/admin/notices", error);
    return NextResponse.json({ error: "Failed to update notice." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const unauthorized = await ensureAdmin(request);
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Notice id is required." }, { status: 400 });
    }

    await connectDB();
    const deleted = await Notice.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json({ error: "Notice not found." }, { status: 404 });
    }

    revalidatePublicNoticePages();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/notices", error);
    return NextResponse.json({ error: "Failed to delete notice." }, { status: 500 });
  }
}
