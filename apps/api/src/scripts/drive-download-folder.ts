import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { downloadDriveFile, listFilesInDriveFolder } from "../services/google-drive.service.js";

dotenv.config({ path: "../../.env" });
dotenv.config();

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
  "image/bmp"
]);

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]/g, "_");
}

async function main() {
  const folderId =
    process.argv[2] || process.env.GOOGLE_OCR_SAMPLE_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error(
      "Fournir un folderId en argument ou renseigner GOOGLE_OCR_SAMPLE_FOLDER_ID / GOOGLE_DRIVE_FOLDER_ID."
    );
  }

  const outputDir = path.resolve(process.cwd(), "../../data/invoices");
  await mkdir(outputDir, { recursive: true });

  const files = await listFilesInDriveFolder(folderId);
  const invoiceFiles = files.filter((file) => ALLOWED_MIME_TYPES.has(file.mimeType));

  if (invoiceFiles.length === 0) {
    console.log("Aucun PDF/image facture trouvé dans ce dossier.");
    return;
  }

  for (const file of invoiceFiles) {
    if (!file.id || !file.name) continue;
    const content = await downloadDriveFile(file.id);
    const outputPath = path.join(outputDir, sanitizeFileName(file.name));
    await writeFile(outputPath, content);
    console.log(`Téléchargé: ${file.name}`);
  }

  console.log(`Terminé. Fichiers enregistrés dans ${outputDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
