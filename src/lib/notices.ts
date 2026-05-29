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
  isNew: boolean;
};

export type AdminNotice = PublicNotice & {
  isPublished: boolean;
  legacyId: string | null;
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

export function normalizeNoticeSeed(source: ContentNotice) {
  return {
    legacyId: source.id,
    title: source.title.trim(),
    date: new Date(source.date),
    category: source.category,
    excerpt: source.excerpt.trim(),
    body: source.body.trim(),
    isNew: Boolean(source.isNew),
    isPublished: true,
  };
}
