import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { resolveLegacyNoticePdfPath, resolveNoticePdfPath } from "@/lib/notice-pdf-storage";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ fileName: string }>;
};

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const { fileName } = await params;
    const resolved = resolveNoticePdfPath(fileName);
    const legacyResolved = resolveLegacyNoticePdfPath(fileName);
    if (!resolved && !legacyResolved) {
      return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
    }

    const buffer = resolved
      ? await readFile(resolved).catch(async () => {
          if (!legacyResolved) throw new Error("not found");
          return readFile(legacyResolved);
        })
      : await readFile(legacyResolved as string);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
