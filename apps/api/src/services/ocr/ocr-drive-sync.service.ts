import { writeFile } from "node:fs/promises";
import { env } from "../../config/env.js";
import { downloadDriveFile, listFilesInDriveFolder } from "../google-drive.service.js";
import { ensureInvoiceStorageDir, sanitizeFileName } from "./ocr-storage.service.js";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
  "image/bmp"
]);

export async function syncInvoicesFromDrive(folderId?: string) {
  const driveFolderId = folderId || env.GOOGLE_OCR_SAMPLE_FOLDER_ID || env.GOOGLE_DRIVE_FOLDER_ID;
  if (!driveFolderId) {
    throw new Error("Aucun folder Google Drive configuré pour les factures OCR.");
  }

  const outputDir = await ensureInvoiceStorageDir();
  const files = await listFilesInDriveFolder(driveFolderId);
  const invoiceFiles = files.filter((file) => ALLOWED_MIME_TYPES.has(file.mimeType));

  const downloaded: string[] = [];
  for (const file of invoiceFiles) {
    if (!file.id || !file.name) continue;
    const content = await downloadDriveFile(file.id);
    const outputPath = `${outputDir}/${sanitizeFileName(file.name)}`;
    await writeFile(outputPath, content);
    downloaded.push(outputPath);
  }

  return {
    folderId: driveFolderId,
    scanned: files.length,
    downloadedCount: downloaded.length,
    files: downloaded
  };
}
