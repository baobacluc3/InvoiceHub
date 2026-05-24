import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

const mimeToExt: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

export const allowedUploadMimeTypes = Object.keys(mimeToExt);
export const maxUploadFileSizeBytes = 10 * 1024 * 1024;

export function getSafeUploadFileName(mimeType: string) {
  const extension = mimeToExt[mimeType] ?? "";
  return `${Date.now()}-${randomUUID()}${extension}`;
}

export function getUploadRootPath() {
  return UPLOAD_ROOT;
}

export async function saveUploadedFile(file: File, fileName: string) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await mkdir(UPLOAD_ROOT, { recursive: true });

  const filePath = path.join(UPLOAD_ROOT, fileName);
  await writeFile(filePath, buffer);

  return {
    storagePath: fileName,
    mimeType: file.type,
    size: buffer.byteLength,
  };
}

export function resolveUploadStoragePath(storagePath: string) {
  return path.join(UPLOAD_ROOT, storagePath);
}
