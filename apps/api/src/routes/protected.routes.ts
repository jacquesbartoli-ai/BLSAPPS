import type { NextFunction, Request, RequestHandler, Response } from "express";
import { Router } from "express";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear.js";
import { z } from "zod";
import { requireRole } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { performBackupNow } from "../services/backup.service.js";
import { generateDemoPdfs } from "../services/pdf/pdf-templates.service.js";
import { buildProductionLotNumber } from "../utils/lot-number.js";

dayjs.extend(weekOfYear);

const router = Router();
const managerRole = requireRole(["admin", "commercial"]);

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

router.get("/me", (req, res) => {
  res.json({ user: req.auth });
});

router.get(
  "/stock/overview",
  managerRole,
  asyncHandler(async (_req, res) => {
    const [suppliers, ingredients, lots] = await Promise.all([
      prisma.supplier.findMany({ orderBy: { name: "asc" } }),
      prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
      prisma.ingredientLot.findMany({
        orderBy: { receptionDate: "desc" },
        include: {
          ingredient: true,
          supplier: true
        }
      })
    ]);
    res.json({ suppliers, ingredients, lots });
  })
);

router.post(
  "/stock/suppliers",
  managerRole,
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      name: z.string().min(2),
      email: z.string().email().optional(),
      phone: z.string().min(6).optional()
    });
    const data = bodySchema.parse(req.body);
    const supplier = await prisma.supplier.create({ data });
    res.status(201).json(supplier);
  })
);

router.post(
  "/stock/ingredients",
  managerRole,
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      name: z.string().min(2),
      defaultUnit: z.enum(["kg", "g", "l", "ml", "piece"])
    });
    const data = bodySchema.parse(req.body);
    const ingredient = await prisma.ingredient.create({ data });
    res.status(201).json(ingredient);
  })
);

router.post(
  "/stock/lots",
  managerRole,
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      ingredientId: z.string().min(1),
      supplierId: z.string().min(1),
      supplierInvoiceId: z.string().min(1).optional(),
      supplierLotRef: z.string().optional(),
      receptionDate: z.string().datetime(),
      expirationDate: z.string().datetime().optional(),
      receivedQty: z.coerce.number().positive(),
      unitPrice: z.coerce.number().positive().optional()
    });
    const data = bodySchema.parse(req.body);
    const internalLotCode = `LOT-${dayjs(data.receptionDate).format("YYYYMMDD")}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;

    const lot = await prisma.$transaction(async (tx) => {
      const created = await tx.ingredientLot.create({
        data: {
          ingredientId: data.ingredientId,
          supplierId: data.supplierId,
          supplierInvoiceId: data.supplierInvoiceId,
          supplierLotRef: data.supplierLotRef,
          internalLotCode,
          receptionDate: new Date(data.receptionDate),
          expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
          receivedQty: data.receivedQty,
          remainingQty: data.receivedQty,
          unitPrice: data.unitPrice
        }
      });

      await tx.ingredient.update({
        where: { id: data.ingredientId },
        data: { currentStock: { increment: data.receivedQty } }
      });

      return created;
    });
    res.status(201).json(lot);
  })
);

router.get(
  "/recettes",
  managerRole,
  asyncHandler(async (_req, res) => {
    const recipes = await prisma.recipe.findMany({
      orderBy: { productName: "asc" },
      include: {
        items: {
          orderBy: { position: "asc" },
          include: { ingredient: true }
        }
      }
    });
    res.json(recipes);
  })
);

router.post(
  "/recettes",
  managerRole,
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      productName: z.string().min(2),
      instructions: z.string().min(4),
      casingType: z.string().optional(),
      seasoning: z.string().optional(),
      items: z
        .array(
          z.object({
            ingredientId: z.string().min(1),
            quantityPerKg: z.coerce.number().positive()
          })
        )
        .min(1)
    });
    const data = bodySchema.parse(req.body);
    const recipe = await prisma.recipe.create({
      data: {
        productName: data.productName,
        instructions: data.instructions,
        casingType: data.casingType,
        seasoning: data.seasoning,
        items: {
          create: data.items.map((item, index) => ({
            ingredientId: item.ingredientId,
            quantityPerKg: item.quantityPerKg,
            position: index
          }))
        }
      },
      include: {
        items: {
          include: { ingredient: true }
        }
      }
    });
    res.status(201).json(recipe);
  })
);

router.get(
  "/production/bootstrap",
  managerRole,
  asyncHandler(async (_req, res) => {
    const [recipes, lots] = await Promise.all([
      prisma.recipe.findMany({
        orderBy: { productName: "asc" },
        include: { items: { include: { ingredient: true }, orderBy: { position: "asc" } } }
      }),
      prisma.ingredientLot.findMany({
        where: { remainingQty: { gt: 0 } },
        orderBy: { receptionDate: "asc" },
        include: { ingredient: true, supplier: true }
      })
    ]);
    res.json({ recipes, lots });
  })
);

router.get(
  "/production",
  managerRole,
  asyncHandler(async (_req, res) => {
    const batches = await prisma.productionBatch.findMany({
      orderBy: { startedAt: "desc" },
      include: {
        recipe: true,
        usages: { include: { ingredientLot: { include: { ingredient: true } } } },
        journalEntries: true
      },
      take: 50
    });
    res.json(batches);
  })
);

router.post(
  "/production/fabrications",
  managerRole,
  asyncHandler(async (req, res) => {
    if (!req.auth?.userId) {
      return res.status(401).json({ message: "Authentification requise." });
    }
    const operatorId = req.auth.userId;

    const bodySchema = z.object({
      recipeId: z.string().min(1),
      producedQtyKg: z.coerce.number().positive(),
      startedAt: z.string().datetime().optional(),
      usages: z
        .array(
          z.object({
            ingredientLotId: z.string().min(1),
            quantityUsed: z.coerce.number().positive(),
            unit: z.enum(["kg", "g", "l", "ml", "piece"]).default("kg")
          })
        )
        .min(1)
    });
    const data = bodySchema.parse(req.body);
    const productionDate = data.startedAt ? new Date(data.startedAt) : new Date();

    const production = await prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.findUnique({
        where: { id: data.recipeId }
      });
      if (!recipe) {
        throw new Error("Recette introuvable.");
      }

      const lotIds = data.usages.map((usage) => usage.ingredientLotId);
      const lots = await tx.ingredientLot.findMany({
        where: { id: { in: lotIds } }
      });
      if (lots.length !== lotIds.length) {
        throw new Error("Au moins un lot utilisé est introuvable.");
      }

      const firstReceptionDate = lots.reduce((minDate, lot) =>
        lot.receptionDate < minDate ? lot.receptionDate : minDate
      , lots[0].receptionDate);
      const lotNumber = buildProductionLotNumber(firstReceptionDate, productionDate);
      const existing = await tx.productionBatch.findUnique({ where: { lotNumber } });
      if (existing) {
        throw new Error("Un lot de production existe déjà avec ce numéro.");
      }

      for (const usage of data.usages) {
        const lot = lots.find((entry) => entry.id === usage.ingredientLotId);
        if (!lot) {
          throw new Error(`Lot introuvable: ${usage.ingredientLotId}`);
        }
        if (Number(lot.remainingQty) < usage.quantityUsed) {
          throw new Error(`Quantité insuffisante sur le lot ${lot.internalLotCode}`);
        }
      }

      const createdBatch = await tx.productionBatch.create({
        data: {
          lotNumber,
          recipeId: recipe.id,
          productName: recipe.productName,
          producedQtyKg: data.producedQtyKg,
          receptionWeek: dayjs(firstReceptionDate).week(),
          receptionYear2: Number(dayjs(firstReceptionDate).format("YY")),
          productionDay: dayjs(productionDate).date(),
          productionWeek: dayjs(productionDate).week(),
          startedAt: productionDate,
          operatorId
        }
      });

      for (const usage of data.usages) {
        const lot = lots.find((entry) => entry.id === usage.ingredientLotId);
        if (!lot) {
          continue;
        }
        await tx.productionUsage.create({
          data: {
            productionBatchId: createdBatch.id,
            ingredientLotId: usage.ingredientLotId,
            quantityUsed: usage.quantityUsed,
            unit: usage.unit
          }
        });
        await tx.ingredientLot.update({
          where: { id: usage.ingredientLotId },
          data: { remainingQty: { decrement: usage.quantityUsed } }
        });
        await tx.ingredient.update({
          where: { id: lot.ingredientId },
          data: { currentStock: { decrement: usage.quantityUsed } }
        });
      }

      await tx.productionJournalEntry.create({
        data: {
          productionBatchId: createdBatch.id,
          action: "create_batch",
          details: `Fabrication créée par ${operatorId}`
        }
      });

      return tx.productionBatch.findUnique({
        where: { id: createdBatch.id },
        include: {
          usages: { include: { ingredientLot: { include: { ingredient: true } } } },
          journalEntries: true
        }
      });
    });

    res.status(201).json(production);
  })
);

router.get("/fiches-lot", requireRole(["admin", "commercial"]), async (_req, res) => {
  res.json({ message: "TODO: document central de traçabilité." });
});

router.get("/commandes", requireRole(["admin", "commercial"]), async (_req, res) => {
  res.json({ message: "TODO: intégration Odoo et consolidation commandes." });
});

router.get("/bl", requireRole(["admin", "livreur"]), async (_req, res) => {
  res.json({ message: "TODO: bons de livraison + signature selfie GPS." });
});

router.get("/avoirs", requireRole(["admin", "commercial"]), async (_req, res) => {
  res.json({ message: "TODO: génération avoir + photos obligatoires." });
});

router.get("/haccp", requireRole(["admin", "commercial"]), async (_req, res) => {
  res.json({ message: "TODO: checklist nettoyage + non-conformités." });
});

router.get("/traceabilite", requireRole(["admin", "commercial"]), async (_req, res) => {
  res.json({ message: "TODO: recherche lot / date / client / produit." });
});

router.post("/settings/backups/run", requireRole(["admin"]), async (_req, res) => {
  const backup = await performBackupNow();
  res.json(backup);
});

router.get("/pdfs/demo", requireRole(["admin", "commercial"]), async (_req, res) => {
  const files = await generateDemoPdfs();
  res.json({ files });
});

export { router as protectedRouter };
