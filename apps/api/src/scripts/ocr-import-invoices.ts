import { readdir } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { importInvoiceFromOcr } from "../services/ocr/ocr-import.service.js";
import { prisma } from "../lib/prisma.js";

dotenv.config({ path: "../../.env" });
dotenv.config();

const ALLOWED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"]);

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.log("Base PostgreSQL indisponible. Démarrer la DB avant l'import OCR.");
    await prisma.$disconnect();
    return;
  }

  try {
    const invoicesDir = process.argv[2]
      ? path.resolve(process.cwd(), process.argv[2])
      : path.resolve(process.cwd(), "../../data/invoices");

    const entries = await readdir(invoicesDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()));

    if (files.length === 0) {
      console.log(`Aucune facture détectée dans ${invoicesDir}`);
      return;
    }

    let importedInvoices = 0;
    let importedLots = 0;
    for (const fileName of files) {
      const filePath = path.join(invoicesDir, fileName);
      try {
        const result = await importInvoiceFromOcr({
          filePath,
          autoCreateIngredients: true,
          minLineConfidence: 0.62,
          forceImport: false
        });
        importedInvoices += 1;
        importedLots += result.createdLots.length;
        console.log(
          `[IMPORTED] ${fileName} | supplier=${result.supplier.name} | lots=${result.createdLots.length}`
        );
      } catch (error) {
        console.log(`[SKIPPED] ${fileName} | ${error instanceof Error ? error.message : "Erreur inconnue"}`);
      }
    }

    console.log(`Terminé. Factures importées=${importedInvoices}, lots créés=${importedLots}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
