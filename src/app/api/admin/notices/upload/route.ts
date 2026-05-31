import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-session";
import { saveNoticePdf } from "@/lib/notice-pdf-storage";

export const dynamic = "force-dynamic";

const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB

function sanitizeBaseName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "notice"
  );
}

export async function POST(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
    }

    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "PDF is too large (max 15 MB)." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${sanitizeBaseName(file.name)}.pdf`;

    const url = await saveNoticePdf(buffer, fileName);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("POST /api/admin/notices/upload", error);
    return NextResponse.json({ error: "Failed to upload PDF." }, { status: 500 });
  }
}
