import { NextResponse } from "next/server";
import { getPublishedNotices } from "@/lib/notices";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notices = await getPublishedNotices();
    return NextResponse.json({ items: notices });
  } catch (error) {
    console.error("GET /api/notices", error);
    return NextResponse.json({ error: "Failed to load notices." }, { status: 500 });
  }
}
