const demoCreditNotes = [
  { id: "AV-2026-014", client: "Boucherie du Centre", reason: "Produit abîmé", status: "Envoyé Odoo" },
  { id: "AV-2026-015", client: "Maison Teyssier", reason: "Erreur quantité", status: "En validation" }
];

export function CreditNotesPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold">Avoirs</h2>
        <p className="text-sm text-foreground/80">
          Démo visuelle: prise de photos obligatoire avant validation et envoi Odoo.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold">Nouvel avoir (démo)</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-dashed border-border bg-background p-3 text-sm">
            Photo produits retournés (obligatoire)
          </div>
          <div className="rounded-md border border-dashed border-border bg-background p-3 text-sm">
            Photo bon de retour (obligatoire)
          </div>
        </div>
        <button className="mt-3 rounded-md bg-primary px-3 py-2 text-primary-foreground">Créer avoir & envoyer Odoo</button>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold">Historique avoirs</h3>
        <div className="space-y-2 text-sm">
          {demoCreditNotes.map((note) => (
            <div key={note.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background px-3 py-2">
              <span className="font-medium">{note.id}</span>
              <span>{note.client}</span>
              <span>{note.reason}</span>
              <span className="rounded-full bg-accent px-2 py-1 text-xs">{note.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
