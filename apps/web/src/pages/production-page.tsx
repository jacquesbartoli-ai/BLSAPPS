import { type FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

type BootstrapRecipe = {
  id: string;
  productName: string;
  items: Array<{
    ingredient: {
      name: string;
    };
    quantityPerKg: string;
  }>;
};

type BootstrapLot = {
  id: string;
  internalLotCode: string;
  remainingQty: string;
  ingredient: {
    name: string;
  };
};

type ProductionBatch = {
  id: string;
  lotNumber: string;
  productName: string;
  producedQtyKg: string;
  startedAt: string;
  usages: Array<{
    id: string;
    quantityUsed: string;
    ingredientLot: {
      internalLotCode: string;
      ingredient: {
        name: string;
      };
    };
  }>;
};

export function ProductionPage() {
  const [recipes, setRecipes] = useState<BootstrapRecipe[]>([]);
  const [lots, setLots] = useState<BootstrapLot[]>([]);
  const [productions, setProductions] = useState<ProductionBatch[]>([]);
  const [recipeId, setRecipeId] = useState("");
  const [producedQtyKg, setProducedQtyKg] = useState("");
  const [usages, setUsages] = useState([{ ingredientLotId: "", quantityUsed: "" }]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [bootstrap, productionList] = await Promise.all([
        apiFetch<{ recipes: BootstrapRecipe[]; lots: BootstrapLot[] }>("/api/production/bootstrap"),
        apiFetch<ProductionBatch[]>("/api/production")
      ]);
      setRecipes(bootstrap.recipes);
      setLots(bootstrap.lots);
      setProductions(productionList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement production.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === recipeId) ?? null,
    [recipes, recipeId]
  );

  function addUsageLine() {
    setUsages((prev) => [...prev, { ingredientLotId: "", quantityUsed: "" }]);
  }

  async function onCreateProduction(event: FormEvent) {
    event.preventDefault();
    await apiFetch("/api/production/fabrications", {
      method: "POST",
      body: JSON.stringify({
        recipeId,
        producedQtyKg: Number(producedQtyKg),
        usages: usages.map((usage) => ({
          ingredientLotId: usage.ingredientLotId,
          quantityUsed: Number(usage.quantityUsed),
          unit: "kg"
        }))
      })
    });
    setProducedQtyKg("");
    setUsages([{ ingredientLotId: "", quantityUsed: "" }]);
    await load();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold">Production</h2>
        <p className="text-sm text-foreground/80">
          Création de fabrication avec consommation de lots et numéro de lot automatique.
        </p>
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <form className="space-y-3 rounded-xl border border-border bg-card p-4" onSubmit={onCreateProduction}>
        <h3 className="font-semibold">Nouvelle fabrication</h3>
        <select
          required
          value={recipeId}
          onChange={(e) => setRecipeId(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
        >
          <option value="">Choisir une recette</option>
          {recipes.map((recipe) => (
            <option value={recipe.id} key={recipe.id}>
              {recipe.productName}
            </option>
          ))}
        </select>
        {selectedRecipe ? (
          <div className="rounded-md bg-background p-3 text-sm">
            <p className="mb-1 font-medium">Intrants de la recette</p>
            <ul className="list-inside list-disc">
              {selectedRecipe.items.map((item, index) => (
                <li key={`${item.ingredient.name}-${index}`}>
                  {item.ingredient.name}: {item.quantityPerKg}/kg
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <input
          type="number"
          min="0.001"
          step="0.001"
          required
          value={producedQtyKg}
          onChange={(e) => setProducedQtyKg(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
          placeholder="Quantité produite (kg)"
        />
        <div className="space-y-2">
          {usages.map((usage, index) => (
            <div className="grid gap-2 md:grid-cols-2" key={`usage-${index}`}>
              <select
                required
                value={usage.ingredientLotId}
                onChange={(e) =>
                  setUsages((prev) =>
                    prev.map((line, i) => (i === index ? { ...line, ingredientLotId: e.target.value } : line))
                  )
                }
                className="rounded-md border border-border bg-background px-3 py-2"
              >
                <option value="">Lot utilisé</option>
                {lots.map((lot) => (
                  <option value={lot.id} key={lot.id}>
                    {lot.internalLotCode} · {lot.ingredient.name} · reste {lot.remainingQty}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0.001"
                step="0.001"
                required
                value={usage.quantityUsed}
                onChange={(e) =>
                  setUsages((prev) =>
                    prev.map((line, i) => (i === index ? { ...line, quantityUsed: e.target.value } : line))
                  )
                }
                className="rounded-md border border-border bg-background px-3 py-2"
                placeholder="Qté utilisée (kg)"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={addUsageLine} className="rounded-md bg-accent px-3 py-2 text-sm">
            + Lot consommé
          </button>
          <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground">
            Valider fabrication
          </button>
        </div>
      </form>

      <section className="space-y-3">
        {productions.map((batch) => (
          <article key={batch.id} className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold">
              {batch.productName} · Lot {batch.lotNumber}
            </h3>
            <p className="text-sm text-foreground/80">
              {batch.producedQtyKg} kg · {new Date(batch.startedAt).toLocaleString("fr-FR")}
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {batch.usages.map((usage) => (
                <li key={usage.id} className="rounded-md bg-background px-3 py-2">
                  {usage.ingredientLot.ingredient.name} — {usage.quantityUsed} kg ({usage.ingredientLot.internalLotCode})
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
