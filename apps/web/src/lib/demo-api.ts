type Unit = "kg" | "g" | "l" | "ml" | "piece";

type DemoSupplier = {
  id: string;
  name: string;
  email?: string;
};

type DemoIngredient = {
  id: string;
  name: string;
  defaultUnit: Unit;
  currentStock: number;
};

type DemoLot = {
  id: string;
  ingredientId: string;
  supplierId: string;
  internalLotCode: string;
  receptionDate: string;
  remainingQty: number;
};

type DemoRecipe = {
  id: string;
  productName: string;
  instructions: string;
  casingType?: string;
  seasoning?: string;
  items: Array<{
    id: string;
    ingredientId: string;
    quantityPerKg: number;
  }>;
};

type DemoProduction = {
  id: string;
  lotNumber: string;
  productName: string;
  producedQtyKg: number;
  startedAt: string;
  usages: Array<{
    id: string;
    ingredientLotId: string;
    quantityUsed: number;
  }>;
};

type DemoDb = {
  suppliers: DemoSupplier[];
  ingredients: DemoIngredient[];
  lots: DemoLot[];
  recipes: DemoRecipe[];
  productions: DemoProduction[];
};

const DEMO_DB_KEY = "bartoliDemoDbV1";

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function weekNumber(input: Date) {
  const date = new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function buildLotNumber(receptionIso: string, productionIso: string) {
  const receptionDate = new Date(receptionIso);
  const productionDate = new Date(productionIso);
  const receptionWeek = pad2(weekNumber(receptionDate));
  const receptionYear2 = String(receptionDate.getFullYear()).slice(-2);
  const productionDay = pad2(productionDate.getDate());
  const productionWeek = pad2(weekNumber(productionDate));
  return `${receptionWeek}${receptionYear2}${productionDay}${productionWeek}`;
}

function seedDemoDb(): DemoDb {
  return {
    suppliers: [
      { id: "sup-1", name: "Viandes du Tarn", email: "contact@viandes-tarn.fr" },
      { id: "sup-2", name: "Épices Méditerranée", email: "vente@epices-med.fr" }
    ],
    ingredients: [
      { id: "ing-1", name: "Viande porc maigre", defaultUnit: "kg", currentStock: 186.2 },
      { id: "ing-2", name: "Gras de porc", defaultUnit: "kg", currentStock: 72.8 },
      { id: "ing-3", name: "Poivre noir moulu", defaultUnit: "kg", currentStock: 8.45 },
      { id: "ing-4", name: "Boyau naturel 40/43", defaultUnit: "piece", currentStock: 520 }
    ],
    lots: [
      {
        id: "lot-1",
        ingredientId: "ing-1",
        supplierId: "sup-1",
        internalLotCode: "LOT-20260301-A12X",
        receptionDate: "2026-03-01T08:30:00.000Z",
        remainingQty: 120
      },
      {
        id: "lot-2",
        ingredientId: "ing-2",
        supplierId: "sup-1",
        internalLotCode: "LOT-20260301-B18Y",
        receptionDate: "2026-03-01T08:35:00.000Z",
        remainingQty: 55.5
      },
      {
        id: "lot-3",
        ingredientId: "ing-3",
        supplierId: "sup-2",
        internalLotCode: "LOT-20260228-P77Q",
        receptionDate: "2026-02-28T11:10:00.000Z",
        remainingQty: 4.2
      }
    ],
    recipes: [
      {
        id: "rec-1",
        productName: "Saucisse fraîche artisanale",
        instructions:
          "Hacher gros, mélanger assaisonnement, embosser en boyau naturel, laisser reposer 12h.",
        casingType: "Naturel 40/43",
        seasoning: "Sel, poivre, ail",
        items: [
          { id: "ri-1", ingredientId: "ing-1", quantityPerKg: 0.78 },
          { id: "ri-2", ingredientId: "ing-2", quantityPerKg: 0.2 },
          { id: "ri-3", ingredientId: "ing-3", quantityPerKg: 0.02 }
        ]
      }
    ],
    productions: [
      {
        id: "prod-1",
        lotNumber: "09260510",
        productName: "Saucisse fraîche artisanale",
        producedQtyKg: 95.2,
        startedAt: "2026-03-05T07:40:00.000Z",
        usages: [
          { id: "pu-1", ingredientLotId: "lot-1", quantityUsed: 74.3 },
          { id: "pu-2", ingredientLotId: "lot-2", quantityUsed: 19.1 },
          { id: "pu-3", ingredientLotId: "lot-3", quantityUsed: 1.8 }
        ]
      }
    ]
  };
}

function getDb(): DemoDb {
  const raw = localStorage.getItem(DEMO_DB_KEY);
  if (!raw) {
    const initial = seedDemoDb();
    localStorage.setItem(DEMO_DB_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw) as DemoDb;
  } catch {
    const initial = seedDemoDb();
    localStorage.setItem(DEMO_DB_KEY, JSON.stringify(initial));
    return initial;
  }
}

function saveDb(db: DemoDb) {
  localStorage.setItem(DEMO_DB_KEY, JSON.stringify(db));
}

function parseBody(init?: RequestInit) {
  if (!init?.body || typeof init.body !== "string") {
    return {};
  }
  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function asStockOverview(db: DemoDb) {
  return {
    suppliers: db.suppliers,
    ingredients: db.ingredients.map((ingredient) => ({
      ...ingredient,
      currentStock: String(ingredient.currentStock)
    })),
    lots: db.lots.map((lot) => ({
      ...lot,
      remainingQty: String(lot.remainingQty),
      ingredient: {
        name: db.ingredients.find((ingredient) => ingredient.id === lot.ingredientId)?.name ?? "Inconnu"
      },
      supplier: {
        name: db.suppliers.find((supplier) => supplier.id === lot.supplierId)?.name ?? "Inconnu"
      }
    }))
  };
}

function asRecipes(db: DemoDb) {
  return db.recipes.map((recipe) => ({
    ...recipe,
    items: recipe.items.map((item) => ({
      ...item,
      quantityPerKg: String(item.quantityPerKg),
      ingredient: {
        name: db.ingredients.find((ingredient) => ingredient.id === item.ingredientId)?.name ?? "Inconnu"
      }
    }))
  }));
}

function asProductionBootstrap(db: DemoDb) {
  return {
    recipes: db.recipes.map((recipe) => ({
      id: recipe.id,
      productName: recipe.productName,
      items: recipe.items.map((item) => ({
        quantityPerKg: String(item.quantityPerKg),
        ingredient: {
          name: db.ingredients.find((ingredient) => ingredient.id === item.ingredientId)?.name ?? "Inconnu"
        }
      }))
    })),
    lots: db.lots
      .filter((lot) => lot.remainingQty > 0)
      .map((lot) => ({
        id: lot.id,
        internalLotCode: lot.internalLotCode,
        remainingQty: String(lot.remainingQty),
        ingredient: {
          name: db.ingredients.find((ingredient) => ingredient.id === lot.ingredientId)?.name ?? "Inconnu"
        }
      }))
  };
}

function asProductions(db: DemoDb) {
  return db.productions.map((production) => ({
    ...production,
    producedQtyKg: String(production.producedQtyKg),
    usages: production.usages.map((usage) => {
      const lot = db.lots.find((entry) => entry.id === usage.ingredientLotId);
      const ingredientName =
        db.ingredients.find((ingredient) => ingredient.id === lot?.ingredientId)?.name ?? "Inconnu";
      return {
        id: usage.id,
        quantityUsed: String(usage.quantityUsed),
        ingredientLot: {
          internalLotCode: lot?.internalLotCode ?? "LOT-UNKNOWN",
          ingredient: {
            name: ingredientName
          }
        }
      };
    })
  }));
}

export function resetDemoData() {
  localStorage.removeItem(DEMO_DB_KEY);
}

export async function handleDemoApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 180));
  const method = (init?.method ?? "GET").toUpperCase();
  const body = parseBody(init);
  const db = getDb();

  if (path === "/auth/login" && method === "POST") {
    return {
      accessToken: "demo-access-token",
      refreshToken: "demo-refresh-token",
      user: {
        id: "demo-user",
        role: "admin",
        fullName: "Compte Démo"
      }
    } as T;
  }

  if (path === "/api/stock/overview" && method === "GET") {
    return asStockOverview(db) as T;
  }

  if (path === "/api/stock/suppliers" && method === "POST") {
    const supplier = {
      id: id("sup"),
      name: String(body.name ?? "Nouveau fournisseur"),
      email: typeof body.email === "string" ? body.email : undefined
    };
    db.suppliers.unshift(supplier);
    saveDb(db);
    return supplier as T;
  }

  if (path === "/api/stock/ingredients" && method === "POST") {
    const ingredient = {
      id: id("ing"),
      name: String(body.name ?? "Nouvel ingrédient"),
      defaultUnit: (body.defaultUnit as Unit) ?? "kg",
      currentStock: 0
    };
    db.ingredients.unshift(ingredient);
    saveDb(db);
    return ingredient as T;
  }

  if (path === "/api/stock/lots" && method === "POST") {
    const ingredientId = String(body.ingredientId ?? "");
    const supplierId = String(body.supplierId ?? "");
    const receptionIso = String(body.receptionDate ?? new Date().toISOString());
    const receivedQty = Number(body.receivedQty ?? 0);

    const lot = {
      id: id("lot"),
      ingredientId,
      supplierId,
      internalLotCode: `LOT-${new Date(receptionIso).toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`,
      receptionDate: receptionIso,
      remainingQty: receivedQty
    };

    db.lots.unshift(lot);
    const ingredient = db.ingredients.find((entry) => entry.id === ingredientId);
    if (ingredient) {
      ingredient.currentStock += receivedQty;
    }
    saveDb(db);
    return lot as T;
  }

  if (path === "/api/recettes" && method === "GET") {
    return asRecipes(db) as T;
  }

  if (path === "/api/recettes" && method === "POST") {
    const created = {
      id: id("rec"),
      productName: String(body.productName ?? "Produit"),
      instructions: String(body.instructions ?? ""),
      casingType: typeof body.casingType === "string" ? body.casingType : undefined,
      seasoning: typeof body.seasoning === "string" ? body.seasoning : undefined,
      items: Array.isArray(body.items)
        ? body.items.map((item) => ({
            id: id("ri"),
            ingredientId: String((item as Record<string, unknown>).ingredientId ?? ""),
            quantityPerKg: Number((item as Record<string, unknown>).quantityPerKg ?? 0)
          }))
        : []
    };
    db.recipes.unshift(created);
    saveDb(db);
    return {
      ...created,
      items: created.items.map((item) => ({
        ...item,
        quantityPerKg: String(item.quantityPerKg),
        ingredient: {
          name: db.ingredients.find((ingredient) => ingredient.id === item.ingredientId)?.name ?? "Inconnu"
        }
      }))
    } as T;
  }

  if (path === "/api/production/bootstrap" && method === "GET") {
    return asProductionBootstrap(db) as T;
  }

  if (path === "/api/production" && method === "GET") {
    return asProductions(db) as T;
  }

  if (path === "/api/production/fabrications" && method === "POST") {
    const recipeId = String(body.recipeId ?? "");
    const producedQtyKg = Number(body.producedQtyKg ?? 0);
    const startedAt = new Date().toISOString();
    const usagesInput = Array.isArray(body.usages) ? body.usages : [];

    const selectedRecipe = db.recipes.find((recipe) => recipe.id === recipeId);
    if (!selectedRecipe) {
      throw new Error("Recette introuvable en mode démo.");
    }

    const usageModels = usagesInput.map((usage) => ({
      id: id("pu"),
      ingredientLotId: String((usage as Record<string, unknown>).ingredientLotId ?? ""),
      quantityUsed: Number((usage as Record<string, unknown>).quantityUsed ?? 0)
    }));

    for (const usage of usageModels) {
      const lot = db.lots.find((entry) => entry.id === usage.ingredientLotId);
      if (!lot) {
        throw new Error("Lot introuvable en mode démo.");
      }
      if (lot.remainingQty < usage.quantityUsed) {
        throw new Error(`Stock insuffisant pour ${lot.internalLotCode}`);
      }
    }

    const receptionDate = db.lots.find((entry) => entry.id === usageModels[0]?.ingredientLotId)?.receptionDate ?? startedAt;
    const lotNumber = buildLotNumber(receptionDate, startedAt);
    const production = {
      id: id("prod"),
      lotNumber,
      productName: selectedRecipe.productName,
      producedQtyKg,
      startedAt,
      usages: usageModels
    };

    db.productions.unshift(production);
    for (const usage of usageModels) {
      const lot = db.lots.find((entry) => entry.id === usage.ingredientLotId);
      if (!lot) continue;
      lot.remainingQty -= usage.quantityUsed;
      const ingredient = db.ingredients.find((entry) => entry.id === lot.ingredientId);
      if (ingredient) {
        ingredient.currentStock -= usage.quantityUsed;
      }
    }
    saveDb(db);

    return asProductions(db).find((entry) => entry.id === production.id) as T;
  }

  throw new Error(`Endpoint démo non géré: ${method} ${path}`);
}
