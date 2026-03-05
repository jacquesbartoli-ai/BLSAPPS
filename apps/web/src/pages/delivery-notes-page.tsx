import { useState } from "react";
import { SignatureCapture } from "../components/delivery/signature-capture";

export function DeliveryNotesPage() {
  const [lastCapture, setLastCapture] = useState<string>("Aucune signature capturée.");

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold">Bons de livraison</h2>
        <p className="text-sm text-foreground/80">
          Aperçu du flux signature: prénom client + signature + selfie + géolocalisation + horodatage.
        </p>
      </section>

      <SignatureCapture
        onValidate={(payload) => {
          setLastCapture(
            `Signé par ${payload.customerFirstName} le ${new Date(payload.signedAt).toLocaleString("fr-FR")}`
          );
        }}
      />

      <p className="text-sm text-foreground/70">{lastCapture}</p>
    </div>
  );
}
