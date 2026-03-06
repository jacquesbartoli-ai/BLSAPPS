import dayjs from "dayjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { parseSupplierInvoiceWithOcr, type ParsedInvoiceDraft, type ParsedInvoiceLine } from "./ocr-invoice.service.js";

type ImportFromOcrOptions = {
  filePath: string;
  supplierId?: string;
  autoCreateIngredients?: boolean;
  minLineConfidence?: number;
  forceImport?: boolean;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDateToIso(value: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [_, dd, mm, yyyy] = match;
  const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toPrismaUnit(unit: ParsedInvoiceLine["unit"]) {
  if (unit === "kg" || unit === "g" || unit === "l" || unit === "ml" || unit === "piece") {
    return unit;
  }
  return "kg";
}

function buildOcrLotCode(index: number) {
  return `OCR-${dayjs().format("YYYYMMDD")}-${String(index + 1).padStart(2, "0")}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

async function resolveSupplier(
  tx: Prisma.TransactionClient,
  supplierId: string | undefined,
  parsed: ParsedInvoiceDraft
) {
  if (supplierId) {
    const existing = await tx.supplier.findUnique({ where: { id: supplierId } });
    if (!existing) {
      throw new Error("Supplier introuvable.");
    }
    return existing;
  }

  const supplierName = parsed.extracted.supplierName?.trim();
  if (!supplierName) {
    return tx.supplier.create({
      data: {
        name: "Fournisseur OCR non identifié"
      }
    });
  }

  const allSuppliers = await tx.supplier.findMany();
  const normalizedTarget = normalizeText(supplierName);
  const best = allSuppliers.find((supplier) => {
    const normalizedSupplier = normalizeText(supplier.name);
    return normalizedSupplier.includes(normalizedTarget) || normalizedTarget.includes(normalizedSupplier);
  });
  if (best) return best;

  return tx.supplier.create({
    data: {
      name: supplierName
    }
  });
}

function scoreIngredientSimilarity(candidate: string, ingredientName: string) {
  const left = normalizeText(candidate);
  const right = normalizeText(ingredientName);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.82;

  const leftTokens = new Set(left.split(" "));
  const rightTokens = new Set(right.split(" "));
  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(leftTokens.size, rightTokens.size, 1);
}

async function resolveIngredient(
  tx: Prisma.TransactionClient,
  productName: string,
  unit: ParsedInvoiceLine["unit"],
  autoCreateIngredients: boolean
) {
  const ingredients = await tx.ingredient.findMany();
  let bestId: string | null = null;
  let bestScore = 0;

  for (const ingredient of ingredients) {
    const score = scoreIngredientSimilarity(productName, ingredient.name);
    if (score > bestScore) {
      bestScore = score;
      bestId = ingredient.id;
    }
  }

  if (bestId && bestScore >= 0.65) {
    return tx.ingredient.findUniqueOrThrow({ where: { id: bestId } });
  }

  if (!autoCreateIngredients) {
    return null;
  }

  return tx.ingredient.create({
    data: {
      name: productName,
      defaultUnit: toPrismaUnit(unit)
    }
  });
}

export async function previewInvoiceFromOcr(filePath: string) {
  return parseSupplierInvoiceWithOcr(filePath);
}

export async function importInvoiceFromOcr(options: ImportFromOcrOptions) {
  const parsed = await parseSupplierInvoiceWithOcr(options.filePath);
  const minLineConfidence = options.minLineConfidence ?? 0.58;
  const autoCreateIngredients = options.autoCreateIngredients ?? true;

  if (parsed.extracted.invoiceType === "non_stock_invoice" && !options.forceImport) {
    throw new Error(
      "Facture classée non matière-première. Utiliser forceImport=true pour forcer l'import."
    );
  }

  const acceptedLines = parsed.extracted.lines.filter(
    (line) =>
      line.confidence >= minLineConfidence &&
      line.quantity !== null &&
      line.quantity > 0 &&
      line.productName.length >= 3
  );
  if (acceptedLines.length === 0) {
    throw new Error("Aucune ligne suffisamment fiable à importer.");
  }

  const existingInvoice = await prisma.supplierInvoice.findFirst({
    where: {
      pdfUrl: options.filePath
    }
  });
  if (existingInvoice) {
    throw new Error("Cette facture est déjà importée.");
  }

  const invoiceDate = parseDateToIso(parsed.extracted.invoiceDate);

  return prisma.$transaction(async (tx) => {
    const supplier = await resolveSupplier(tx, options.supplierId, parsed);
    const invoice = await tx.supplierInvoice.create({
      data: {
        supplierId: supplier.id,
        invoiceNumber: parsed.extracted.invoiceNumber,
        invoiceDate: invoiceDate ?? undefined,
        pdfUrl: options.filePath,
        ocrRawText: parsed.rawText,
        ocrJson: parsed as unknown as object,
        status: "imported"
      }
    });

    const createdLots: Array<{
      lotId: string;
      ingredientId: string;
      ingredientName: string;
      quantity: number;
      unitPrice: number | null;
      confidence: number;
    }> = [];

    for (let index = 0; index < acceptedLines.length; index += 1) {
      const line = acceptedLines[index];
      const ingredient = await resolveIngredient(tx, line.productName, line.unit, autoCreateIngredients);
      if (!ingredient || line.quantity === null || line.quantity <= 0) {
        continue;
      }

      const quantity = line.quantity;
      const lot = await tx.ingredientLot.create({
        data: {
          ingredientId: ingredient.id,
          supplierId: supplier.id,
          supplierInvoiceId: invoice.id,
          supplierLotRef: parsed.extracted.invoiceNumber ?? undefined,
          internalLotCode: buildOcrLotCode(index),
          receptionDate: invoiceDate ?? new Date(),
          receivedQty: quantity,
          remainingQty: quantity,
          unitPrice: line.unitPrice ?? undefined
        }
      });

      await tx.ingredient.update({
        where: { id: ingredient.id },
        data: {
          currentStock: {
            increment: quantity
          }
        }
      });

      createdLots.push({
        lotId: lot.id,
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantity,
        unitPrice: line.unitPrice,
        confidence: line.confidence
      });
    }

    return {
      supplier: {
        id: supplier.id,
        name: supplier.name
      },
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        invoiceType: parsed.extracted.invoiceType
      },
      acceptedLines: acceptedLines.length,
      createdLots
    };
  });
}
