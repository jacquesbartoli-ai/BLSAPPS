const demoLot = {
  lotNumber: "09260510",
  product: "Saucisse fraîche artisanale",
  intrants: [
    { ingredient: "Viande porc maigre", lot: "LOT-20260301-A12X", qty: "74.3 kg" },
    { ingredient: "Gras de porc", lot: "LOT-20260301-B18Y", qty: "19.1 kg" },
    { ingredient: "Poivre noir moulu", lot: "LOT-20260228-P77Q", qty: "1.8 kg" }
  ],
  outputs: [
    { date: "06/03/2026 09:15", client: "Client A", qty: "24.5 kg" },
    { date: "06/03/2026 14:30", client: "Client B", qty: "33.0 kg" },
    { date: "07/03/2026 08:20", client: "Client C", qty: "28.9 kg" }
  ],
  producedKg: 95.2,
  soldKg: 86.4
};

export function LotSheetsPage() {
  const shrinkage = (((demoLot.producedKg - demoLot.soldKg) / demoLot.producedKg) * 100).toFixed(2);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold">Fiche de lot</h2>
        <p className="text-sm text-foreground/80">
          Démo visuelle de la fiche de traçabilité centralisée avec intrants, sorties et sèche.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <h3 className="font-semibold">
            Lot {demoLot.lotNumber} · {demoLot.product}
          </h3>
          <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">Imprimer PDF</button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Intrants utilisés</p>
            <div className="space-y-2 text-sm">
              {demoLot.intrants.map((intrant) => (
                <div key={intrant.lot} className="rounded-md bg-background px-3 py-2">
                  <p className="font-medium">{intrant.ingredient}</p>
                  <p>
                    Lot {intrant.lot} · {intrant.qty}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Sorties clients</p>
            <div className="space-y-2 text-sm">
              {demoLot.outputs.map((output, index) => (
                <div key={`${output.client}-${index}`} className="rounded-md bg-background px-3 py-2">
                  <p className="font-medium">{output.client}</p>
                  <p>
                    {output.date} · {output.qty}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm">
          <p>
            Produit: <strong>{demoLot.producedKg} kg</strong> · Vendu: <strong>{demoLot.soldKg} kg</strong>
          </p>
          <p>
            Sèche calculée (Fin de lot): <strong>{shrinkage}%</strong>
          </p>
        </div>
      </section>
    </div>
  );
}
