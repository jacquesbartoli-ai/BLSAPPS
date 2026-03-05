const demoTasks = [
  { zone: "Salle de découpe", task: "Désinfection plan de travail", done: true, operator: "Lucie M." },
  { zone: "Embossage", task: "Nettoyage embosseuse", done: true, operator: "Tom R." },
  { zone: "Chambre froide", task: "Contrôle température + nettoyage", done: false, operator: "Nina P." }
];

export function TraceabilityPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold">Traçabilité & HACCP</h2>
        <p className="text-sm text-foreground/80">
          Démo visuelle recherche lot/date/client et suivi protocole nettoyage quotidien.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold">Recherche traçabilité</h3>
        <div className="grid gap-2 md:grid-cols-4">
          <input className="rounded-md border border-border bg-background px-3 py-2" placeholder="Lot" />
          <input className="rounded-md border border-border bg-background px-3 py-2" placeholder="Date" />
          <input className="rounded-md border border-border bg-background px-3 py-2" placeholder="Client" />
          <input className="rounded-md border border-border bg-background px-3 py-2" placeholder="Produit" />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold">Checklist HACCP du jour</h3>
        <div className="space-y-2 text-sm">
          {demoTasks.map((task, index) => (
            <div key={`${task.zone}-${index}`} className="rounded-md bg-background px-3 py-2">
              <p className="font-medium">{task.zone}</p>
              <p>{task.task}</p>
              <p>
                Opérateur: {task.operator} · Statut:{" "}
                <span className={task.done ? "text-green-700" : "text-red-700"}>
                  {task.done ? "Conforme" : "Non-conformité (commentaire requis)"}
                </span>
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
