import type { Notice as ContentNotice } from "@/lib/content";
import connectDB from "@/lib/mongodb";
import NoticeModel, { type NoticeDocument } from "@/models/Notice";

export const NOTICE_CATEGORY_OPTIONS = [
  "General",
  "Schedule",
  "Admission",
  "Assessment",
  "Hostel",
  "Fees",
  "Documents",
  "Workshop",
  "Examination",
  "Placement",
] as const;
export type NoticeCategory = string;

export type PublicNotice = {
  id: string;
  title: string;
  date: string;
  category: NoticeCategory;
  excerpt: string;
  body: string;
  pdfUrl: string | null;
  isNew: boolean;
};

export type AdminNotice = PublicNotice & {
  isPublished: boolean;
  legacyId: string | null;
};

export const NOTICES_PAGE_SIZE = 10;

export type PublishedNoticesPage = {
  items: PublicNotice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function toIsoDate(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function toPublicNotice(doc: NoticeDocument): PublicNotice {
  return {
    id: doc._id.toString(),
    title: doc.title,
    date: toIsoDate(doc.date),
    category: doc.category as NoticeCategory,
    excerpt: doc.excerpt,
    body: doc.body,
    pdfUrl: doc.pdfUrl?.trim() || null,
    isNew: Boolean(doc.isNew),
  };
}

export function toAdminNotice(doc: NoticeDocument): AdminNotice {
  return {
    ...toPublicNotice(doc),
    isPublished: Boolean(doc.isPublished),
    legacyId: doc.legacyId ?? null,
  };
}

export async function getPublishedNotices(limit?: number): Promise<PublicNotice[]> {
  await connectDB();
  const query = NoticeModel.find({ isPublished: true }).sort({ createdAt: -1 });
  if (typeof limit === "number" && limit > 0) {
    query.limit(limit);
  }
  const docs = await query.lean();
  return docs.map((doc) => toPublicNotice(doc as NoticeDocument));
}

export async function getPublishedNoticesPage(
  page = 1,
  limit = NOTICES_PAGE_SIZE,
): Promise<PublishedNoticesPage> {
  await connectDB();

  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const total = await NoticeModel.countDocuments({ isPublished: true });
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const skip = (safePage - 1) * safeLimit;

  const docs = await NoticeModel.find({ isPublished: true })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(safeLimit)
    .lean();

  return {
    items: docs.map((doc) => toPublicNotice(doc as NoticeDocument)),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
  };
}

export function paginateNotices(items: PublicNotice[], page = 1, limit = NOTICES_PAGE_SIZE): PublishedNoticesPage {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * safeLimit;

  return {
    items: items.slice(start, start + safeLimit),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
  };
}

export function normalizeNoticeSeed(source: ContentNotice) {
  return {
    legacyId: source.id,
    title: source.title.trim(),
    date: new Date(source.date),
    category: source.category,
    excerpt: source.excerpt.trim(),
    body: source.body.trim(),
    pdfUrl: null,
    isNew: Boolean(source.isNew),
    isPublished: true,
  };
}
