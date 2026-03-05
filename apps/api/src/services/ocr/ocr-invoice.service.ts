import { readFile } from "node:fs/promises";
import { extractTextWithGoogleVision } from "./google-vision.service.js";

type ParsedInvoiceDraft = {
  rawText: string;
  extracted: {
    supplierName: string | null;
    invoiceDate: string | null;
    lines: Array<{
      productName: string;
      quantity: number | null;
      unitPrice: number | null;
    }>;
  };
  warning: string;
};

/**
 * OCR technique disponible, mais mapping métier volontairement minimal tant que
 * des factures réelles ne sont pas fournies pour fiabiliser les regex/heuristiques.
 */
export async function parseSupplierInvoiceWithOcr(filePath: string): Promise<ParsedInvoiceDraft> {
  const fileBuffer = await readFile(filePath);
  const rawText = await extractTextWithGoogleVision(fileBuffer.toString("base64"));
  return {
    rawText,
    extracted: {
      supplierName: null,
      invoiceDate: null,
      lines: []
    },
    warning:
      "Extraction OCR brute réalisée. Fournir des factures exemples pour activer le mapping structuré fiable."
  };
}
