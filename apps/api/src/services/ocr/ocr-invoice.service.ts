import { readFile } from "node:fs/promises";
import path from "node:path";
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

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff"]);

function normalizeNumber(value: string | null) {
  if (!value) return null;
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? number : null;
}

function extractInvoiceDate(rawText: string) {
  const labelDate = rawText.match(
    /(date(?:\s+facture)?|du)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i
  );
  if (labelDate?.[2]) {
    return labelDate[2];
  }
  const fallback = rawText.match(/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/);
  return fallback?.[1] ?? null;
}

function extractSupplierName(lines: string[]) {
  for (const line of lines) {
    const match = line.match(/(?:fournisseur|supplier|vendeur)\s*[:\-]\s*(.+)$/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  const firstMeaningful = lines.find(
    (line) =>
      line.length > 3 &&
      !/(facture|invoice|bon|livraison|date|page|total|tva|ht|ttc)/i.test(line)
  );
  return firstMeaningful ?? null;
}

function extractLines(rawText: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const result: Array<{ productName: string; quantity: number | null; unitPrice: number | null }> = [];

  for (const line of lines) {
    if (/(total|sous-total|tva|montant|net\s+à\s+payer|ttc|ht)/i.test(line)) {
      continue;
    }

    const compact = line.replace(/\s{2,}/g, " ");
    const numbers = compact.match(/\d+(?:[.,]\d+)?/g) ?? [];
    if (numbers.length < 2) {
      continue;
    }

    const quantity = normalizeNumber(numbers[0] ?? null);
    const unitPrice = normalizeNumber(numbers[numbers.length - 1] ?? null);
    const productName = compact
      .replace(/\d+(?:[.,]\d+)?\s*(kg|g|l|ml|pi[eè]ce|pcs?)?/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!productName || productName.length < 2) {
      continue;
    }

    result.push({
      productName,
      quantity,
      unitPrice
    });
  }

  return result.slice(0, 100);
}

async function extractRawText(filePath: string) {
  const fileBuffer = await readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();

  if (IMAGE_EXTENSIONS.has(extension)) {
    return extractTextWithGoogleVision(fileBuffer.toString("base64"));
  }

  if (extension === ".pdf") {
    const pdfParseModule = await import("pdf-parse");
    const parser = new pdfParseModule.PDFParse({ data: fileBuffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const text = parsed?.text?.trim() ?? "";
    if (text.length > 0) {
      return text;
    }
    throw new Error(
      "PDF sans texte exploitable. Fournir une image/scanner ou activer un pipeline OCR PDF dédié."
    );
  }

  throw new Error(`Format non supporté: ${extension || "inconnu"}`);
}

export async function parseSupplierInvoiceWithOcr(filePath: string): Promise<ParsedInvoiceDraft> {
  const rawText = await extractRawText(filePath);
  const textLines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const extractedLines = extractLines(rawText);

  return {
    rawText,
    extracted: {
      supplierName: extractSupplierName(textLines),
      invoiceDate: extractInvoiceDate(rawText),
      lines: extractedLines
    },
    warning:
      extractedLines.length === 0
        ? "Aucune ligne article fiable détectée. Ajustement requis avec factures réelles."
        : "Extraction heuristique effectuée. Valider les lignes avant création de lot."
  };
}
