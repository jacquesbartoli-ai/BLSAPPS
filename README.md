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

👉 Données nécessaires pour activer les intégrations:
- Odoo: `ODOO_BASE_URL` (domaine), `ODOO_DATABASE`, `ODOO_API_KEY` et soit `ODOO_USER_ID`, soit `ODOO_USERNAME`
- Google Drive: `GOOGLE_DRIVE_FOLDER_ID` + (service account **ou** OAuth client + refresh token)
- Google Vision OCR: `GOOGLE_VISION_API_KEY`
- Plusieurs factures fournisseurs réelles (PDF/scans) pour entraîner les règles de mapping (produit, qty, prix, date, fournisseur)

Dès réception des factures exemples, j’active le mapping OCR structuré et la création automatique des lots.

## Obtenir GOOGLE_OAUTH_REFRESH_TOKEN (Google Drive)

Depuis le backend:

```bash
npm run google:oauth:url --workspace @bartoli/api
```

1. Ouvrir l’URL affichée et autoriser l’accès Drive.
2. Copier le paramètre `code` renvoyé par Google sur `http://localhost/?code=...`.
3. Lancer:

```bash
npm run google:oauth:exchange --workspace @bartoli/api -- "CODE_ICI"
```

Le script affiche `GOOGLE_OAUTH_REFRESH_TOKEN` à coller dans `.env`.
