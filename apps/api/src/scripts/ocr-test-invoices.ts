import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { parseSupplierInvoiceWithOcr } from "../services/ocr/ocr-invoice.service.js";

dotenv.config({ path: "../../.env" });
dotenv.config();

const ALLOWED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"]);

async function main() {
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

  const report: Array<{
    fileName: string;
    supplierName: string | null;
    invoiceDate: string | null;
    lineCount: number;
    warning: string;
  }> = [];

  for (const fileName of files) {
    const filePath = path.join(invoicesDir, fileName);
    try {
      const parsed = await parseSupplierInvoiceWithOcr(filePath);
      report.push({
        fileName,
        supplierName: parsed.extracted.supplierName,
        invoiceDate: parsed.extracted.invoiceDate,
        lineCount: parsed.extracted.lines.length,
        warning: parsed.warning
      });
      console.log(
        `[OK] ${fileName} | fournisseur=${parsed.extracted.supplierName ?? "-"} | date=${
          parsed.extracted.invoiceDate ?? "-"
        } | lignes=${parsed.extracted.lines.length}`
      );
    } catch (error) {
      report.push({
        fileName,
        supplierName: null,
        invoiceDate: null,
        lineCount: 0,
        warning: error instanceof Error ? error.message : "Erreur OCR inconnue"
      });
      console.log(`[ERR] ${fileName} | ${error instanceof Error ? error.message : "Erreur inconnue"}`);
    }
  }

  const outputPath = path.join(invoicesDir, "ocr-report.json");
  await writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Rapport écrit: ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
