import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

export const NOTICE_PDF_DIR = path.join(process.cwd(), "data", "notices");
export const LEGACY_NOTICE_PDF_DIR = path.join(process.cwd(), "public", "notices");
export const NOTICE_PDF_URL_PREFIX = "/api/notices/files/";
const LEGACY_NOTICE_PDF_URL_PREFIX = "/notices/";

function sanitizeFileName(fileName: string): string | null {
  if (!fileName || fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    return null;
  }
  return fileName;
}

export function extractNoticePdfFileName(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  if (url.startsWith(NOTICE_PDF_URL_PREFIX)) {
    return sanitizeFileName(url.slice(NOTICE_PDF_URL_PREFIX.length));
  }

  // Backward compatibility for previously stored DB URLs.
  if (url.startsWith(LEGACY_NOTICE_PDF_URL_PREFIX)) {
    return sanitizeFileName(url.slice(LEGACY_NOTICE_PDF_URL_PREFIX.length));
  }

  return null;
}

export function resolveNoticePdfPath(fileName: string): string | null {
  const safe = sanitizeFileName(fileName);
  if (!safe) return null;

  const baseDir = path.resolve(NOTICE_PDF_DIR);
  const resolved = path.resolve(baseDir, safe);
  if (!resolved.startsWith(baseDir + path.sep)) {
    return null;
  }

  return resolved;
}

export function resolveLegacyNoticePdfPath(fileName: string): string | null {
  const safe = sanitizeFileName(fileName);
  if (!safe) return null;

  const baseDir = path.resolve(LEGACY_NOTICE_PDF_DIR);
  const resolved = path.resolve(baseDir, safe);
  if (!resolved.startsWith(baseDir + path.sep)) {
    return null;
  }

  return resolved;
}

export async function saveNoticePdf(buffer: Buffer, fileName: string): Promise<string> {
  await mkdir(NOTICE_PDF_DIR, { recursive: true });
  const resolved = resolveNoticePdfPath(fileName);
  if (!resolved) {
    throw new Error("Invalid PDF filename.");
  }
  await writeFile(resolved, buffer);
  return `${NOTICE_PDF_URL_PREFIX}${fileName}`;
}

/**
 * Removes a previously uploaded notice PDF from the /public/notices folder.
 * Only deletes files that live directly inside NOTICE_PDF_DIR; anything else
 * (external URLs, traversal attempts, missing files) is ignored safely.
 */
export async function deleteNoticePdf(url: string | null | undefined): Promise<void> {
  const fileName = extractNoticePdfFileName(url);
  if (!fileName) {
    return;
  }
  const resolved = resolveNoticePdfPath(fileName);
  const legacyResolved = resolveLegacyNoticePdfPath(fileName);

  try {
    if (resolved) {
      await unlink(resolved);
    }
  } catch {
    // File may already be gone — nothing to clean up.
  }

  try {
    if (legacyResolved) {
      await unlink(legacyResolved);
    }
  } catch {
    // Legacy file may not exist.
  }
}
