import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

export const NOTICE_PDF_DIR = path.join(process.cwd(), "public", "notices");
export const NOTICE_PDF_URL_PREFIX = "/notices/";

export async function saveNoticePdf(buffer: Buffer, fileName: string): Promise<string> {
  await mkdir(NOTICE_PDF_DIR, { recursive: true });
  await writeFile(path.join(NOTICE_PDF_DIR, fileName), buffer);
  return `${NOTICE_PDF_URL_PREFIX}${fileName}`;
}

/**
 * Removes a previously uploaded notice PDF from the /public/notices folder.
 * Only deletes files that live directly inside NOTICE_PDF_DIR; anything else
 * (external URLs, traversal attempts, missing files) is ignored safely.
 */
export async function deleteNoticePdf(url: string | null | undefined): Promise<void> {
  if (!url || typeof url !== "string" || !url.startsWith(NOTICE_PDF_URL_PREFIX)) {
    return;
  }

  const fileName = url.slice(NOTICE_PDF_URL_PREFIX.length);
  if (!fileName || fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    return;
  }

  const resolved = path.resolve(NOTICE_PDF_DIR, fileName);
  if (!resolved.startsWith(path.resolve(NOTICE_PDF_DIR) + path.sep)) {
    return;
  }

  try {
    await unlink(resolved);
  } catch {
    // File may already be gone — nothing to clean up.
  }
}
