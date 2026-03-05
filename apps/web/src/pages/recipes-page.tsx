import { type FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type Ingredient = {
  id: string;
  name: string;
};

type Recipe = {
  id: string;
  productName: string;
  instructions: string;
  casingType?: string | null;
  seasoning?: string | null;
  items: Array<{
    id: string;
    quantityPerKg: string;
    ingredient: {
      name: string;
    };
  }>;
};

export function RecipesPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [productName, setProductName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [casingType, setCasingType] = useState("");
  const [seasoning, setSeasoning] = useState("");
  const [items, setItems] = useState([{ ingredientId: "", quantityPerKg: "" }]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [stock, recipesResult] = await Promise.all([
        apiFetch<{ ingredients: Ingredient[] }>("/api/stock/overview"),
        apiFetch<Recipe[]>("/api/recettes")
      ]);
      setIngredients(stock.ingredients);
      setRecipes(recipesResult);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement recettes.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function addItemLine() {
    setItems((prev) => [...prev, { ingredientId: "", quantityPerKg: "" }]);
  }

  async function onCreateRecipe(event: FormEvent) {
    event.preventDefault();
    await apiFetch("/api/recettes", {
      method: "POST",
      body: JSON.stringify({
        productName,
        instructions,
        casingType: casingType || undefined,
        seasoning: seasoning || undefined,
        items: items.map((item) => ({
          ingredientId: item.ingredientId,
          quantityPerKg: Number(item.quantityPerKg)
        }))
      })
    });
    setProductName("");
    setInstructions("");
    setCasingType("");
    setSeasoning("");
    setItems([{ ingredientId: "", quantityPerKg: "" }]);
    await load();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold">Recettes</h2>
        <p className="text-sm text-foreground/80">
          Fiches par produit fini avec intrants en quantité par kg.
        </p>
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <form className="space-y-3 rounded-xl border border-border bg-card p-4" onSubmit={onCreateRecipe}>
        <h3 className="font-semibold">Nouvelle recette</h3>
        <input
          required
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
          placeholder="Nom du produit fini"
        />
        <textarea
          required
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
          placeholder="Instructions"
          rows={3}
        />
        <div className="grid gap-2 md:grid-cols-2">
          <input
            value={casingType}
            onChange={(e) => setCasingType(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2"
            placeholder="Type de boyau"
          />
          <input
            value={seasoning}
            onChange={(e) => setSeasoning(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2"
            placeholder="Assaisonnement"
          />
        </div>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div className="grid gap-2 md:grid-cols-2" key={`item-${index}`}>
              <select
                required
                value={item.ingredientId}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((line, i) => (i === index ? { ...line, ingredientId: e.target.value } : line))
                  )
                }
                className="rounded-md border border-border bg-background px-3 py-2"
              >
                <option value="">Ingrédient</option>
                {ingredients.map((ingredient) => (
                  <option value={ingredient.id} key={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0.001"
                step="0.001"
                required
                value={item.quantityPerKg}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((line, i) => (i === index ? { ...line, quantityPerKg: e.target.value } : line))
                  )
                }
                className="rounded-md border border-border bg-background px-3 py-2"
                placeholder="Quantité par kg"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" className="rounded-md bg-accent px-3 py-2 text-sm" onClick={addItemLine}>
            + Ingrédient
          </button>
          <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground">Créer recette</button>
        </div>
      </form>

      <section className="space-y-3">
        {recipes.map((recipe) => (
          <article key={recipe.id} className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold">{recipe.productName}</h3>
            <p className="mb-2 text-sm text-foreground/80">{recipe.instructions}</p>
            <p className="mb-2 text-xs text-foreground/70">
              Boyau: {recipe.casingType || "-"} · Assaisonnement: {recipe.seasoning || "-"}
            </p>
            <ul className="space-y-1 text-sm">
              {recipe.items.map((item) => (
                <li key={item.id} className="rounded-md bg-background px-3 py-2">
                  {item.ingredient.name}: {item.quantityPerKg}/kg
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
