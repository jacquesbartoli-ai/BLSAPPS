import { readFile } from "node:fs/promises";
import path from "node:path";
import { extractTextWithGoogleVision } from "./google-vision.service.js";

export type ParsedInvoiceLine = {
  productName: string;
  normalizedProductName: string;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  unit: "kg" | "g" | "l" | "ml" | "piece" | null;
  confidence: number;
  sourceLine: string;
};

export type ParsedInvoiceDraft = {
  rawText: string;
  extracted: {
    supplierName: string | null;
    invoiceDate: string | null;
    invoiceNumber: string | null;
    invoiceType: "raw_materials" | "non_stock_invoice" | "unknown";
    globalConfidence: number;
    lines: ParsedInvoiceLine[];
  };
  warning: string;
};

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff"]);
const NUMBER_PATTERN = /\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{1,3})|\d+/g;
const MONEY_PATTERN = /\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2,3})/g;
const STOP_LINE_REGEX =
  /(total|sous-total|tva|montant|net\s+à\s+payer|ttc|ht|iban|bic|swift|échéance|page\s+\d+|commande|livraison|transport|client|adresse|facture|invoice|r[eé]f[ée]rence|conditions|paiement)/i;
const INGREDIENT_HINTS = [
  "viande",
  "porc",
  "boeuf",
  "veau",
  "agneau",
  "volaille",
  "poivre",
  "sel",
  "epice",
  "épice",
  "boyau",
  "ail",
  "paprika",
  "piment",
  "muscade",
  "coriandre",
  "romarin",
  "thym",
  "laurier",
  "mix",
  "sauc",
  "figat",
  "gras",
  "maigre",
  "lard"
];

function normalizeNumber(value: string | null) {
  if (!value) return null;
  const normalized = value.replace(/\s/g, "").replace(",", ".").replace(/[^0-9.\-]/g, "");
  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? number : null;
}

function normalizeLineSpacing(input: string) {
  let line = input.replace(/\t/g, " ").replace(/\s+/g, " ").trim();
  line = line.replace(/\b([A-Za-zÀ-ÖØ-öø-ÿ])\s(?=[A-Za-zÀ-ÖØ-öø-ÿ]{1,2}\b)/g, "$1");
  line = line.replace(/\b([A-Za-zÀ-ÖØ-öø-ÿ])\s(?=[A-Za-zÀ-ÖØ-öø-ÿ]{3,}\b)/g, "$1");
  return line;
}

function normalizeText(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map((line) => normalizeLineSpacing(line))
    .filter(Boolean);
}

function normalizeDateString(input: string) {
  const match = input.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!match) return null;
  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  let year = Number.parseInt(match[3], 10);
  if (year < 100) year += 2000;
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000 || year > 2100) return null;
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function extractInvoiceDate(lines: string[]) {
  const text = lines.join("\n");
  const labelDate = text.match(
    /(date(?:\s+facture)?|du)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i
  );
  if (labelDate?.[2]) {
    return normalizeDateString(labelDate[2]);
  }
  for (const line of lines.slice(0, 40)) {
    const fallback = line.match(/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/);
    if (fallback?.[1]) {
      const normalized = normalizeDateString(fallback[1]);
      if (normalized) return normalized;
    }
  }
  return null;
}

function cleanSupplierCandidate(input: string) {
  return input.replace(/[|]/g, " ").replace(/\s{2,}/g, " ").trim();
}

function scoreSupplierLine(line: string, index: number) {
  if (line.length < 3 || line.length > 120) return -5;
  if (STOP_LINE_REGEX.test(line)) return -4;
  if (/\d{4,}/.test(line)) return -2;

  let score = 0;
  if (index < 12) score += 1.8;
  if (/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(line)) score += 1;
  if (/(sas|sarl|sa|eurl|sasu|origine|atelier|maison|france|group|soci[eé]t[eé])/i.test(line)) {
    score += 1.8;
  }
  if (!/[€$]/.test(line)) score += 0.4;
  if (!/\b(page|facture|invoice|total|montant)\b/i.test(line.toLowerCase())) score += 0.5;
  return score;
}

function extractSupplierName(lines: string[]) {
  for (const line of lines.slice(0, 25)) {
    const match = line.match(/(?:fournisseur|supplier|vendeur)\s*[:\-]\s*(.+)$/i);
    if (match?.[1]) {
      return cleanSupplierCandidate(match[1]);
    }
  }

  let bestIndex = -1;
  let bestScore = -999;
  for (let i = 0; i < Math.min(lines.length, 30); i += 1) {
    const score = scoreSupplierLine(lines[i], i);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex < 0 || bestScore < 0) {
    return null;
  }

  const best = lines[bestIndex];
  const nextLine = lines[bestIndex + 1];
  if (
    nextLine &&
    nextLine.length <= 20 &&
    !STOP_LINE_REGEX.test(nextLine) &&
    !/\d/.test(nextLine) &&
    best.length <= 60
  ) {
    return cleanSupplierCandidate(`${best} ${nextLine}`);
  }

  return cleanSupplierCandidate(best);
}

function normalizeProductName(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countIngredientHints(text: string) {
  const lower = normalizeProductName(text);
  return INGREDIENT_HINTS.reduce((acc, hint) => (lower.includes(hint) ? acc + 1 : acc), 0);
}

function parseLineUnit(line: string): ParsedInvoiceLine["unit"] {
  if (/\bkg\b/i.test(line)) return "kg";
  if (/\bg\b/i.test(line)) return "g";
  if (/\bml\b/i.test(line)) return "ml";
  if (/\bl\b/i.test(line)) return "l";
  if (/\b(pi[eè]ce|pcs?|unit[eé]?|u)\b/i.test(line)) return "piece";
  return null;
}

function extractInvoiceNumber(lines: string[]) {
  const joined = lines.join("\n");
  const labeled = joined.match(
    /(?:facture|invoice|n[°o]|num[eé]ro)\s*(?:de\s*)?(?:facture)?\s*[:#]?\s*([A-Z0-9][A-Z0-9\-_/]{4,})/i
  );
  if (labeled?.[1]) {
    return labeled[1].replace(/[.,;]$/, "");
  }

  for (const line of lines.slice(0, 40)) {
    const factureRef = line.match(/\b([A-Z]{1,4}\s?\d{6,}|\d{8,})\b/);
    if (factureRef?.[1]) {
      return factureRef[1].replace(/\s+/g, "");
    }
  }
  return null;
}

function cleanProductLabel(line: string) {
  return line
    .replace(/(\d+[.,]\d+|\d+)\s*(kg|g|l|ml|pi[eè]ce|pcs?|u)?/gi, " ")
    .replace(/[€$]/g, " ")
    .replace(/\b(pf|code|tarif|lot|ref|réf)\b/gi, " ")
    .replace(/[_/\\|]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractLines(lines: string[]): ParsedInvoiceLine[] {
  const results: ParsedInvoiceLine[] = [];

  for (const line of lines) {
    if (STOP_LINE_REGEX.test(line) || line.length < 4) continue;

    const numberCandidates = line.match(NUMBER_PATTERN) ?? [];
    if (numberCandidates.length < 2) continue;

    const unit = parseLineUnit(line);
    const qtyMatch = line.match(/(\d+(?:[.,]\d{1,3})?)\s*(kg|g|l|ml|pi[eè]ce|pcs?|u)\b/i);
    const quantity = qtyMatch?.[1] ? normalizeNumber(qtyMatch[1]) : normalizeNumber(numberCandidates[0] ?? null);
    const moneyCandidates = line.match(MONEY_PATTERN) ?? [];
    const unitPrice = normalizeNumber(moneyCandidates[0] ?? null);
    const totalPrice =
      moneyCandidates.length > 1 ? normalizeNumber(moneyCandidates[moneyCandidates.length - 1] ?? null) : null;
    const productName = cleanProductLabel(line);
    if (!productName || productName.length < 3) continue;

    const hints = countIngredientHints(productName);
    let confidence = 0.2;
    if (quantity && quantity > 0) confidence += 0.2;
    if (unit) confidence += 0.12;
    if (unitPrice && unitPrice > 0) confidence += 0.16;
    if (totalPrice && totalPrice > 0) confidence += 0.06;
    if (hints > 0) confidence += Math.min(hints * 0.12, 0.3);
    if (!STOP_LINE_REGEX.test(productName)) confidence += 0.05;
    confidence = Math.min(0.99, Number(confidence.toFixed(2)));

    results.push({
      productName,
      normalizedProductName: normalizeProductName(productName),
      quantity,
      unitPrice,
      totalPrice,
      unit,
      confidence,
      sourceLine: line
    });
  }

  const deduped = new Map<string, ParsedInvoiceLine>();
  for (const line of results) {
    if (line.confidence < 0.35) continue;
    const key = `${line.normalizedProductName}|${line.quantity ?? "n"}|${line.unitPrice ?? "n"}|${line.unit ?? "u"}`;
    if (!deduped.has(key) || (deduped.get(key)?.confidence ?? 0) < line.confidence) {
      deduped.set(key, line);
    }
  }

  return [...deduped.values()].slice(0, 120);
}

function inferInvoiceType(lines: ParsedInvoiceLine[]) {
  if (lines.length === 0) return "non_stock_invoice" as const;
  const ingredientRichLines = lines.filter(
    (line) => countIngredientHints(line.productName) > 0 && (line.unit === "kg" || line.unit === "g")
  );
  if (ingredientRichLines.length >= 2) {
    return "raw_materials" as const;
  }
  const avgConfidence = lines.reduce((acc, line) => acc + line.confidence, 0) / Math.max(lines.length, 1);
  if (avgConfidence < 0.52) {
    return "non_stock_invoice" as const;
  }
  return "unknown" as const;
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
    if (text.length > 0) return text;

    throw new Error(
      "PDF sans texte exploitable. Fournir une image/scanner ou activer un pipeline OCR PDF dédié."
    );
  }

  throw new Error(`Format non supporté: ${extension || "inconnu"}`);
}

export async function parseSupplierInvoiceWithOcr(filePath: string): Promise<ParsedInvoiceDraft> {
  const rawText = await extractRawText(filePath);
  const textLines = normalizeText(rawText);
  const extractedLines = extractLines(textLines);
  const invoiceType = inferInvoiceType(extractedLines);
  const globalConfidence = Number(
    (
      extractedLines.reduce((acc, line) => acc + line.confidence, 0) / Math.max(extractedLines.length, 1)
    ).toFixed(2)
  );

  return {
    rawText,
    extracted: {
      supplierName: extractSupplierName(textLines),
      invoiceDate: extractInvoiceDate(textLines),
      invoiceNumber: extractInvoiceNumber(textLines),
      invoiceType,
      globalConfidence,
      lines: extractedLines
    },
    warning:
      extractedLines.length === 0
        ? "Aucune ligne article fiable détectée. Ajustement requis avec factures réelles."
        : invoiceType === "non_stock_invoice"
          ? "Facture probablement non matière-première. Vérification manuelle recommandée."
          : "Extraction heuristique renforcée effectuée. Vérifier avant import automatique."
  };
}
