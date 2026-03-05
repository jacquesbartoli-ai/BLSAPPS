import { Router } from "express";
import { requireRole } from "../middleware/auth.js";
import { performBackupNow } from "../services/backup.service.js";
import { generateDemoPdfs } from "../services/pdf/pdf-templates.service.js";

const router = Router();

router.get("/me", (req, res) => {
  res.json({ user: req.auth });
});

router.get("/stock/ingredients", requireRole(["admin", "commercial"]), async (_req, res) => {
  res.json({ message: "TODO: liste ingrédients / lots / fournisseurs." });
});

router.get("/recettes", requireRole(["admin", "commercial"]), async (_req, res) => {
  res.json({ message: "TODO: CRUD recettes + items." });
});

router.get("/production", requireRole(["admin", "commercial"]), async (_req, res) => {
  res.json({ message: "TODO: nouvelle fabrication + journal + consommation lots." });
});

router.get("/fiches-lot", requireRole(["admin", "commercial"]), async (_req, res) => {
  res.json({ message: "TODO: document central de traçabilité." });
});

router.get("/commandes", requireRole(["admin", "commercial"]), async (_req, res) => {
  res.json({ message: "TODO: intégration Odoo et consolidation commandes." });
});

router.get("/bl", requireRole(["admin", "livreur"]), async (_req, res) => {
  res.json({ message: "TODO: bons de livraison + signature selfie GPS." });
});

router.get("/avoirs", requireRole(["admin", "commercial"]), async (_req, res) => {
  res.json({ message: "TODO: génération avoir + photos obligatoires." });
});

router.get("/haccp", requireRole(["admin", "commercial"]), async (_req, res) => {
  res.json({ message: "TODO: checklist nettoyage + non-conformités." });
});

router.get("/traceabilite", requireRole(["admin", "commercial"]), async (_req, res) => {
  res.json({ message: "TODO: recherche lot / date / client / produit." });
});

router.post("/settings/backups/run", requireRole(["admin"]), async (_req, res) => {
  const backup = await performBackupNow();
  res.json(backup);
});

router.get("/pdfs/demo", requireRole(["admin", "commercial"]), async (_req, res) => {
  const files = await generateDemoPdfs();
  res.json({ files });
});

export { router as protectedRouter };
