import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const ALLOWED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"]);

export function getInvoiceStorageDir() {
  return path.resolve(process.cwd(), "../../data/invoices");
}

export async function ensureInvoiceStorageDir() {
  const dir = getInvoiceStorageDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]/g, "_");
}

export async function listLocalInvoiceFiles() {
  const dir = await ensureInvoiceStorageDir();
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      path: path.join(dir, name)
    }));
}

export function assertInvoiceFilePath(filePath: string) {
  const storageDir = getInvoiceStorageDir();
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(storageDir)) {
    throw new Error("Le fichier doit être dans le dossier local data/invoices.");
  }
  return resolved;
}
