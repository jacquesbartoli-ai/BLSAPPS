import { resetDemoData } from "../lib/demo-api";
import { isDemoMode } from "../lib/demo-mode";

export function SettingsPage() {
  const demoMode = isDemoMode();

  function onResetDemo() {
    resetDemoData();
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold">Réglages & connexion</h2>
        <p className="text-sm text-foreground/80">
          Démo visuelle des réglages techniques et du journal de sauvegarde.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold">Intégrations</h3>
          <ul className="space-y-2 text-sm">
            <li className="rounded-md bg-background px-3 py-2">Odoo: connecté (instance BARTOLI)</li>
            <li className="rounded-md bg-background px-3 py-2">Google Drive: dossier backups configuré</li>
            <li className="rounded-md bg-background px-3 py-2">Email analyses: compte configuré</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold">Backups planifiés</h3>
          <ul className="space-y-2 text-sm">
            <li className="rounded-md bg-background px-3 py-2">10:00 — Succès — backup-20260305-100000.sql</li>
            <li className="rounded-md bg-background px-3 py-2">12:00 — Succès — backup-20260305-120000.sql</li>
            <li className="rounded-md bg-background px-3 py-2">17:00 — En attente</li>
          </ul>
        </div>
      </section>

      {demoMode ? (
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold">Mode démo</h3>
          <p className="mb-3 text-sm text-foreground/80">
            Réinitialise les données visuelles (stock, recettes, productions) à l’état initial.
          </p>
          <button className="rounded-md bg-accent px-3 py-2 text-sm" onClick={onResetDemo}>
            Réinitialiser les données démo
          </button>
        </section>
      ) : null}
    </div>
  );
}
