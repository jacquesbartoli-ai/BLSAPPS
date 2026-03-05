const demoOrders = [
  {
    date: "05/03/2026",
    clientCode: "CL-102",
    client: "Boucherie du Centre",
    products: "Saucisse x120, Merguez x80",
    amount: "1 245,00 EUR"
  },
  {
    date: "05/03/2026",
    clientCode: "CL-204",
    client: "Maison Teyssier",
    products: "Chipolatas x200",
    amount: "1 020,00 EUR"
  },
  {
    date: "06/03/2026",
    clientCode: "CL-055",
    client: "Épicerie Provençale",
    products: "Saucisse sèche x90",
    amount: "980,50 EUR"
  }
];

export function OrdersPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold">Commandes</h2>
        <p className="text-sm text-foreground/80">
          Démo visuelle du flux commercial Odoo: client, cadencier, validation et consolidation.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold">Nouvelle commande (démo)</h3>
        <div className="grid gap-2 md:grid-cols-3">
          <input className="rounded-md border border-border bg-background px-3 py-2" placeholder="Code client" />
          <input className="rounded-md border border-border bg-background px-3 py-2" placeholder="Nom client" />
          <input className="rounded-md border border-border bg-background px-3 py-2" placeholder="Remise globale %" />
        </div>
        <div className="mt-3 rounded-md bg-background p-3 text-sm">
          Cadencier suggéré: Saucisse fraîche (120), Merguez (80), Chipolatas (60)
        </div>
        <div className="mt-3 flex gap-2">
          <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground">Valider & envoyer email</button>
          <button className="rounded-md bg-accent px-3 py-2">Imprimer consolidation</button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold">Liste commandes</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Code</th>
                <th className="px-2 py-2">Client</th>
                <th className="px-2 py-2">Produits</th>
                <th className="px-2 py-2">Montant</th>
              </tr>
            </thead>
            <tbody>
              {demoOrders.map((order) => (
                <tr key={`${order.clientCode}-${order.date}`} className="border-b border-border/60">
                  <td className="px-2 py-2">{order.date}</td>
                  <td className="px-2 py-2">{order.clientCode}</td>
                  <td className="px-2 py-2">{order.client}</td>
                  <td className="px-2 py-2">{order.products}</td>
                  <td className="px-2 py-2">{order.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
