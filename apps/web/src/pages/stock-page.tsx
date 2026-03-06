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

type LocalInvoiceFile = {
  name: string;
  path: string;
};

type OcrPreview = {
  extracted: {
    supplierName: string | null;
    invoiceDate: string | null;
    invoiceNumber: string | null;
    invoiceType: "raw_materials" | "non_stock_invoice" | "unknown";
    globalConfidence: number;
    lines: Array<{
      productName: string;
      quantity: number | null;
      unitPrice: number | null;
      unit: "kg" | "g" | "l" | "ml" | "piece" | null;
      confidence: number;
    }>;
  };
  warning: string;
};

type ImportedInvoice = {
  id: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  supplierName: string;
  pdfUrl: string;
  createdAt: string;
  lotCount: number;
  lots: Array<{
    id: string;
    internalLotCode: string;
    ingredientName: string;
    receivedQty: string;
    remainingQty: string;
  }>;
};

export function StockPage() {
  const [data, setData] = useState<StockOverview | null>(null);
  const [localFiles, setLocalFiles] = useState<LocalInvoiceFile[]>([]);
  const [importedInvoices, setImportedInvoices] = useState<ImportedInvoice[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [minConfidence, setMinConfidence] = useState("0.58");
  const [forceImport, setForceImport] = useState(false);
  const [ocrPreview, setOcrPreview] = useState<OcrPreview | null>(null);
  const [ocrImportMessage, setOcrImportMessage] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
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
      const [overview, filesResult, importedResult] = await Promise.all([
        apiFetch<StockOverview>("/api/stock/overview"),
        apiFetch<{ files: LocalInvoiceFile[] }>("/api/stock/invoices/local-files"),
        apiFetch<{ invoices: ImportedInvoice[] }>("/api/stock/invoices/imported")
      ]);
      setData(overview);
      setLocalFiles(filesResult.files);
      setImportedInvoices(importedResult.invoices);
      if (!selectedFilePath && filesResult.files.length > 0) {
        setSelectedFilePath(filesResult.files[0].path);
      }
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

  async function onSyncDriveInvoices() {
    try {
      setSyncLoading(true);
      setOcrImportMessage(null);
      const result = await apiFetch<{ downloadedCount: number }>("/api/stock/invoices/drive-sync", {
        method: "POST",
        body: JSON.stringify({})
      });
      await load();
      setOcrImportMessage(`Synchronisation Drive OK: ${result.downloadedCount} fichiers téléchargés.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec synchronisation Drive.");
    } finally {
      setSyncLoading(false);
    }
  }

  async function onPreviewInvoice() {
    if (!selectedFilePath) return;
    try {
      setPreviewLoading(true);
      setOcrImportMessage(null);
      const preview = await apiFetch<OcrPreview>("/api/stock/invoices/ocr-preview", {
        method: "POST",
        body: JSON.stringify({ filePath: selectedFilePath })
      });
      setOcrPreview(preview);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prévisualisation OCR impossible.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function onImportInvoice() {
    if (!selectedFilePath) return;
    try {
      setImportLoading(true);
      setOcrImportMessage(null);
      const result = await apiFetch<{ acceptedLines: number; createdLots: Array<{ lotId: string }> }>(
        "/api/stock/invoices/ocr-import",
        {
          method: "POST",
          body: JSON.stringify({
            filePath: selectedFilePath,
            supplierId: selectedSupplierId || undefined,
            autoCreateIngredients: true,
            minLineConfidence: Number(minConfidence),
            forceImport
          })
        }
      );
      setOcrImportMessage(
        `Import OCR réussi: ${result.acceptedLines} lignes retenues, ${result.createdLots.length} lots créés.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import OCR impossible.");
    } finally {
      setImportLoading(false);
    }
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

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">OCR factures fournisseurs</h3>
          <button
            className="rounded-md bg-accent px-3 py-2 text-sm disabled:opacity-70"
            onClick={onSyncDriveInvoices}
            disabled={syncLoading}
          >
            {syncLoading ? "Sync Drive..." : "Synchroniser depuis Drive"}
          </button>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <select
            value={selectedFilePath}
            onChange={(e) => setSelectedFilePath(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2"
          >
            <option value="">Fichier facture local</option>
            {localFiles.map((file) => (
              <option key={file.path} value={file.path}>
                {file.name}
              </option>
            ))}
          </select>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2"
          >
            <option value="">Fournisseur auto-détecté</option>
            {data?.suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <input
            type="number"
            min="0.30"
            max="0.95"
            step="0.01"
            value={minConfidence}
            onChange={(e) => setMinConfidence(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2"
            placeholder="Confiance min"
          />
          <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={forceImport}
              onChange={(e) => setForceImport(e.target.checked)}
            />
            Forcer import non-stock
          </label>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-md bg-accent px-3 py-2 text-sm disabled:opacity-70"
              onClick={onPreviewInvoice}
              disabled={!selectedFilePath || previewLoading}
            >
              {previewLoading ? "Preview..." : "Prévisualiser OCR"}
            </button>
            <button
              className="flex-1 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-70"
              onClick={onImportInvoice}
              disabled={!selectedFilePath || importLoading}
            >
              {importLoading ? "Import..." : "Importer en lots"}
            </button>
          </div>
        </div>

        {ocrImportMessage ? (
          <p className="mt-3 rounded-md bg-background px-3 py-2 text-sm text-green-700">{ocrImportMessage}</p>
        ) : null}

        {ocrPreview ? (
          <div className="mt-3 space-y-2 rounded-md border border-border bg-background p-3 text-sm">
            <p>
              Fournisseur détecté: <strong>{ocrPreview.extracted.supplierName ?? "-"}</strong>
            </p>
            <p>
              Date: <strong>{ocrPreview.extracted.invoiceDate ?? "-"}</strong> · N°:{" "}
              <strong>{ocrPreview.extracted.invoiceNumber ?? "-"}</strong>
            </p>
            <p>
              Type: <strong>{ocrPreview.extracted.invoiceType}</strong> · Confiance globale:{" "}
              <strong>{ocrPreview.extracted.globalConfidence}</strong>
            </p>
            <p className="text-foreground/70">{ocrPreview.warning}</p>
            <div className="max-h-64 overflow-auto rounded-md border border-border">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-2 py-2">Produit</th>
                    <th className="px-2 py-2">Qté</th>
                    <th className="px-2 py-2">PU</th>
                    <th className="px-2 py-2">Unité</th>
                    <th className="px-2 py-2">Confiance</th>
                  </tr>
                </thead>
                <tbody>
                  {ocrPreview.extracted.lines.slice(0, 40).map((line, index) => (
                    <tr key={`${line.productName}-${index}`} className="border-b border-border/60">
                      <td className="px-2 py-1">{line.productName}</td>
                      <td className="px-2 py-1">{line.quantity ?? "-"}</td>
                      <td className="px-2 py-1">{line.unitPrice ?? "-"}</td>
                      <td className="px-2 py-1">{line.unit ?? "-"}</td>
                      <td className="px-2 py-1">{line.confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold">Factures importées & lots créés</h3>
        <div className="space-y-3">
          {importedInvoices.length === 0 ? (
            <p className="text-sm text-foreground/70">Aucune facture importée pour le moment.</p>
          ) : (
            importedInvoices.map((invoice) => (
              <article key={invoice.id} className="rounded-md bg-background p-3 text-sm">
                <p className="font-medium">
                  {invoice.invoiceNumber ?? "Sans numéro"} · {invoice.supplierName}
                </p>
                <p>
                  Date facture:{" "}
                  {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("fr-FR") : "-"} · Lots créés:{" "}
                  {invoice.lotCount}
                </p>
                <p className="text-xs text-foreground/70">Source: {invoice.pdfUrl}</p>
                <div className="mt-2 space-y-1">
                  {invoice.lots.slice(0, 10).map((lot) => (
                    <p key={lot.id} className="rounded-md border border-border px-2 py-1 text-xs">
                      {lot.internalLotCode} · {lot.ingredientName} · reçu {lot.receivedQty}
                    </p>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
