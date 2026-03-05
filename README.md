# Bartoli — PWA métier charcuterie artisanale

Application web progressive (PWA) sécurisée pour la gestion:
- stock & matières premières
- recettes
- fabrication / lots
- traçabilité HACCP
- commandes, BL signés, avoirs
- sauvegardes Google Drive
- intégration Odoo

## Stack

- **Frontend**: React + Vite + TailwindCSS + base shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **DB**: PostgreSQL + Prisma ORM
- **Auth**: JWT + chemin secret URL
- **PWA**: `vite-plugin-pwa`
- **PDF**: `@react-pdf/renderer`
- **Signature**: `signature_pad`
- **Backups**: node-cron + Google Drive API
- **Odoo**: JSON-RPC / REST wrapper

## Arborescence

```txt
.
├── apps
│   ├── api
│   │   ├── prisma
│   │   │   └── schema.prisma
│   │   └── src
│   │       ├── config
│   │       ├── jobs
│   │       ├── lib
│   │       ├── middleware
│   │       ├── routes
│   │       ├── scripts
│   │       ├── services
│   │       │   ├── ocr
│   │       │   └── pdf
│   │       └── utils
│   └── web
│       ├── public
│       └── src
│           ├── components
│           ├── lib
│           └── pages
├── .env.example
└── docker-compose.yml
```

## Sécurité implémentée dans le scaffold

- App/API montée derrière un **chemin secret**: `/${APP_SECRET_PATH}`
- Auth JWT (access + refresh)
- Rôles (`admin`, `commercial`, `livreur`)
- Routes API protégées sauf login
- Middleware d’exigence HTTPS en production
- Rate limiting + Helmet + CORS strict

## Démarrage local

1. Copier les variables d’environnement:
   ```bash
   cp .env.example .env
   ```
2. Démarrer PostgreSQL:
   ```bash
   docker compose up -d
   ```
3. Installer les dépendances:
   ```bash
   npm install
   ```
4. Générer Prisma + migrer:
   ```bash
   npm run prisma:generate --workspace @bartoli/api
   npm run prisma:migrate --workspace @bartoli/api -- --name init
   ```
5. Créer un admin:
   ```bash
   npm run seed:admin --workspace @bartoli/api
   ```
6. Lancer web + API:
   ```bash
   npm run dev
   ```

## Schéma Prisma

Le schéma couvre:
- utilisateurs / rôles / tokens
- ingrédients, fournisseurs, factures, lots, analyses labo
- recettes et intrants
- fabrications, journal de prod, usages de lots, sorties clients, sèche
- clients, commandes, lignes, BL, signatures, avoirs, photos
- HACCP (checklists + tâches signées + non-conformités)
- événements de traçabilité
- réglages et logs de backup

Fichier: `apps/api/prisma/schema.prisma`

## État OCR

Le parseur OCR est volontairement laissé en placeholder:
`apps/api/src/services/ocr/ocr-invoice.service.ts`

👉 Merci de fournir:
- identifiants Odoo (URL, DB, user, clé/API token)
- ID du dossier Google Drive cible
- plusieurs factures fournisseurs réelles (PDF/scans)

Dès réception, j’implémente l’extracteur OCR avec mapping robuste et création automatique des lots.
