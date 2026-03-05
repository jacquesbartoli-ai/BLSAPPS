import { type FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type Supplier = {
  id: string;
  name: string;
  email?: string | null;
};

type Ingredient = {
  id: string;
  name: string;
  defaultUnit: "kg" | "g" | "l" | "ml" | "piece";
  currentStock: string;
};

type Lot = {
  id: string;
  internalLotCode: string;
  receptionDate: string;
  remainingQty: string;
  ingredient: { name: string };
  supplier: { name: string };
};

type StockOverview = {
  suppliers: Supplier[];
  ingredients: Ingredient[];
  lots: Lot[];
};

export function StockPage() {
  const [data, setData] = useState<StockOverview | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [ingredientName, setIngredientName] = useState("");
  const [ingredientUnit, setIngredientUnit] = useState<Ingredient["defaultUnit"]>("kg");
  const [lotForm, setLotForm] = useState({
    ingredientId: "",
    supplierId: "",
    receptionDate: "",
    receivedQty: ""
  });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const overview = await apiFetch<StockOverview>("/api/stock/overview");
      setData(overview);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement stock.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreateSupplier(event: FormEvent) {
    event.preventDefault();
    await apiFetch("/api/stock/suppliers", {
      method: "POST",
      body: JSON.stringify({ name: supplierName })
    });
    setSupplierName("");
    await load();
  }

  async function onCreateIngredient(event: FormEvent) {
    event.preventDefault();
    await apiFetch("/api/stock/ingredients", {
      method: "POST",
      body: JSON.stringify({ name: ingredientName, defaultUnit: ingredientUnit })
    });
    setIngredientName("");
    await load();
  }

  async function onCreateLot(event: FormEvent) {
    event.preventDefault();
    await apiFetch("/api/stock/lots", {
      method: "POST",
      body: JSON.stringify({
        ingredientId: lotForm.ingredientId,
        supplierId: lotForm.supplierId,
        receptionDate: new Date(lotForm.receptionDate).toISOString(),
        receivedQty: Number(lotForm.receivedQty)
      })
    });
    setLotForm((prev) => ({ ...prev, receptionDate: "", receivedQty: "" }));
    await load();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold">Stock & matières premières</h2>
        <p className="text-sm text-foreground/80">
          Création fournisseurs / ingrédients / lots avec mise à jour automatique du stock courant.
        </p>
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <form className="rounded-xl border border-border bg-card p-4" onSubmit={onCreateSupplier}>
          <h3 className="mb-3 font-semibold">Nouveau fournisseur</h3>
          <input
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2"
            placeholder="Nom fournisseur"
          />
          <button className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-primary-foreground">
            Ajouter
          </button>
        </form>

        <form className="rounded-xl border border-border bg-card p-4" onSubmit={onCreateIngredient}>
          <h3 className="mb-3 font-semibold">Nouvel ingrédient</h3>
          <input
            value={ingredientName}
            onChange={(e) => setIngredientName(e.target.value)}
            required
            className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2"
            placeholder="Nom ingrédient"
          />
          <select
            value={ingredientUnit}
            onChange={(e) => setIngredientUnit(e.target.value as Ingredient["defaultUnit"])}
            className="w-full rounded-md border border-border bg-background px-3 py-2"
          >
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="l">l</option>
            <option value="ml">ml</option>
            <option value="piece">pièce</option>
          </select>
          <button className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-primary-foreground">
            Ajouter
          </button>
        </form>

        <form className="rounded-xl border border-border bg-card p-4" onSubmit={onCreateLot}>
          <h3 className="mb-3 font-semibold">Nouveau lot</h3>
          <select
            required
            value={lotForm.ingredientId}
            onChange={(e) => setLotForm((prev) => ({ ...prev, ingredientId: e.target.value }))}
            className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2"
          >
            <option value="">Ingrédient</option>
            {data?.ingredients.map((ingredient) => (
              <option value={ingredient.id} key={ingredient.id}>
                {ingredient.name}
              </option>
            ))}
          </select>
          <select
            required
            value={lotForm.supplierId}
            onChange={(e) => setLotForm((prev) => ({ ...prev, supplierId: e.target.value }))}
            className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2"
          >
            <option value="">Fournisseur</option>
            {data?.suppliers.map((supplier) => (
              <option value={supplier.id} key={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            required
            value={lotForm.receptionDate}
            onChange={(e) => setLotForm((prev) => ({ ...prev, receptionDate: e.target.value }))}
            className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2"
          />
          <input
            type="number"
            step="0.001"
            min="0.001"
            required
            value={lotForm.receivedQty}
            onChange={(e) => setLotForm((prev) => ({ ...prev, receivedQty: e.target.value }))}
            className="w-full rounded-md border border-border bg-background px-3 py-2"
            placeholder="Quantité reçue"
          />
          <button className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-primary-foreground">
            Créer lot
          </button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold">Ingrédients</h3>
          <div className="space-y-2 text-sm">
            {data?.ingredients.map((ingredient) => (
              <div key={ingredient.id} className="flex items-center justify-between rounded-md bg-background px-3 py-2">
                <span>{ingredient.name}</span>
                <span>
                  {ingredient.currentStock} {ingredient.defaultUnit}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold">Lots actifs</h3>
          <div className="space-y-2 text-sm">
            {data?.lots.map((lot) => (
              <div key={lot.id} className="rounded-md bg-background px-3 py-2">
                <p className="font-medium">{lot.internalLotCode}</p>
                <p>
                  {lot.ingredient.name} · {lot.supplier.name}
                </p>
                <p>
                  Reste: {lot.remainingQty} · Réception: {new Date(lot.receptionDate).toLocaleDateString("fr-FR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
