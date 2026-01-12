# WORKFLOW.md — Workflow d'implémentation (Next.js + Firebase) — Plateforme Location Maison Gabon

> Objectif : un workflow **solide**, reproductible, avec **gating tests** et **déploiements contrôlés** (préprod puis prod).

---

# PARTIE 1 — INITIALISATION DU PROJET

> ⚠️ Cette partie est à réaliser **UNE SEULE FOIS** avant de commencer les features.

---

## INIT-1) Prérequis

### Outils requis
```bash
# Node.js (LTS)
node -v  # >= 20.x

# Package manager (npm recommandé)
npm -v  # >= 10.x

# Firebase CLI
firebase --version  # >= 13.x

# Vercel CLI (optionnel mais recommandé)
vercel --version
```

### Comptes requis
- [ ] Compte Firebase (Console Firebase)
- [ ] Compte Vercel
- [ ] Compte Algolia (pour la recherche)
- [ ] Compte GitHub (pour le repo)
- [ ] Compte Airtel Money (pour les paiements)

---

## INIT-2) Création des projets Firebase

### Créer 3 projets sur Firebase Console

| Projet | Nom suggéré | Usage |
|--------|-------------|-------|
| DEV | `location-maison-gabon-dev` | Développement local (émulateurs) |
| PREPROD | `location-maison-gabon-preprod` | Tests UAT, démos |
| PROD | `location-maison-gabon-prod` | Production |

### Pour chaque projet, activer :
- [ ] **Authentication** (Email/Password, Phone, Google, Facebook)
- [ ] **Firestore Database** (mode production)
- [ ] **Storage** (mode production)
- [ ] **Cloud Functions** (Blaze plan requis)
- [ ] **Analytics** (optionnel)

### Récupérer les configurations
Dans Console Firebase > Project Settings > General > Your apps > Web app :
- Copier la configuration Firebase pour chaque projet
- Noter les valeurs pour `.env.local`

---

## INIT-3) Initialisation Next.js

### Le projet existe déjà
Le projet Next.js est déjà initialisé avec :
- ✅ TypeScript
- ✅ ESLint
- ✅ Tailwind CSS
- ✅ `src/` directory
- ✅ App Router
- ✅ Import alias `@/*`

### Vérifier la configuration
```bash
# Vérifier que tout fonctionne
npm run dev
```

---

## INIT-4) Installation des dépendances

### Dépendances principales (déjà installées)
```bash
# Firebase
npm install firebase firebase-admin

# UI (shadcn/ui)
npx shadcn@latest init

# Formulaires & validation
npm install react-hook-form zod @hookform/resolvers

# Data fetching
npm install @tanstack/react-query

# Icons
npm install lucide-react

# Utilitaires
npm install clsx tailwind-merge class-variance-authority
```

### Configuration shadcn/ui
```bash
# Installer les composants de base
npx shadcn@latest add button input label card form toast
```

### Dépendances de développement
```bash
# Tests
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm install -D @playwright/test
npm install -D msw

# Types
npm install -D @types/node
```

---

## INIT-5) Configuration Firebase locale

### Initialiser Firebase dans le projet
```bash
firebase login
firebase init
```

### Sélectionner les services
- [x] Firestore
- [x] Functions
- [x] Storage
- [x] Emulators

### Configuration des émulateurs
```bash
# Choisir les émulateurs :
# - Authentication
# - Functions
# - Firestore
# - Storage

# Ports suggérés :
# - Auth: 9099
# - Functions: 5001
# - Firestore: 8080
# - Storage: 9199
# - UI: 4000
```

### Fichiers générés
```
├── firebase.json           # Config Firebase
├── .firebaserc             # Alias des projets
├── firestore.rules         # Règles Firestore
├── firestore.indexes.json  # Index Firestore
├── storage.rules           # Règles Storage
└── functions/              # Cloud Functions
    ├── package.json
    ├── tsconfig.json
    └── src/
        └── index.ts
```

### Configurer `.firebaserc`
```json
{
  "projects": {
    "default": "location-maison-gabon-dev",
    "dev": "location-maison-gabon-dev",
    "preprod": "location-maison-gabon-preprod",
    "prod": "location-maison-gabon-prod"
  }
}
```

---

## INIT-6) Structure des dossiers

### Structure actuelle (à adapter progressivement)
```
src/
├── app/                    # Routes Next.js (pages, API)
│   ├── (auth)/            # Routes authentification
│   ├── (protected)/       # Routes protégées
│   └── api/               # API routes
│
├── features/              # 🆕 Organisation par fonctionnalité (à créer)
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── models/
│   │   └── actions/
│   ├── properties/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── models/
│   ├── credits/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── repositories/
│   ├── search/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   └── notifications/
│       ├── components/
│       ├── hooks/
│       └── services/
│
├── shared/                # Composants, hooks, utilitaires réutilisables
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── models/
│   └── ui/
│       ├── v1/            # Composants version 1
│       └── v2/            # Composants version 2 (futurs)
│
├── services/              # Services externes
│   ├── firebase/
│   │   ├── firebase.client.ts
│   │   ├── firestore.repo.ts
│   │   ├── storage.repo.ts
│   │   └── auth.service.ts
│   └── algolia/
│       ├── algolia.client.ts
│       └── search.service.ts
│
└── __mocks__/             # Mocks MSW
    ├── handlers/
    └── server.ts
```

> **Note** : La migration vers cette structure se fera progressivement selon le plan de restructuration.

---

## INIT-7) Fichiers de configuration de base

### `.env.example` (à committer)
```bash
# App
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Algolia
NEXT_PUBLIC_ALGOLIA_APP_ID=
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=

# Airtel Money
NEXT_PUBLIC_AGENT_CODE_AIRTEL=

# Émulateurs (dev only)
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true

# Version des composants UI (v1 par défaut)
NEXT_PUBLIC_UI_VERSION=v1
```

### `.env.local` (gitignored)
Copier `.env.example` et remplir avec les vraies valeurs.

### `src/env/env.ts` (validation Zod)
```typescript
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'preprod', 'production']),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  NEXT_PUBLIC_ALGOLIA_APP_ID: z.string().min(1),
  NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY: z.string().min(1),
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: z.string().optional(),
})

export const env = envSchema.parse({
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_ALGOLIA_APP_ID: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
  NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY: process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY,
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS,
})
```

---

## INIT-8) Configuration Git

### Branches principales
```bash
# Créer develop depuis main
git checkout -b develop
git push -u origin develop

# Retourner sur main
git checkout main
git push -u origin main
```

### Configurer la protection des branches (GitHub)
Dans Settings > Branches > Branch protection rules :

**Pour `main`** :
- [x] Require pull request before merging
- [x] Require status checks to pass
- [x] Require branches to be up to date

**Pour `develop`** :
- [x] Require pull request before merging
- [x] Require status checks to pass

---

## INIT-9) Configuration Vercel

### Connecter le projet
```bash
vercel link
```

### Configurer les environnements

**Variables Preview (preprod)** :
```bash
vercel env add NEXT_PUBLIC_APP_ENV preview
# Valeur: preprod

vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID preview
# Valeur: location-maison-gabon-preprod
# ... (toutes les variables)
```

**Variables Production** :
```bash
vercel env add NEXT_PUBLIC_APP_ENV production
# Valeur: production

vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
# Valeur: location-maison-gabon-prod
# ... (toutes les variables)
```

---

## INIT-10) Scripts package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    
    "emulator": "firebase emulators:start --import=./firebase-data --export-on-exit=./firebase-data",
    "emulator:ui": "firebase emulators:start --import=./firebase-data --export-on-exit=./firebase-data --only auth,firestore,storage,functions",
    
    "test": "jest",
    "test:unit": "jest --testPathPattern='__tests__/(unit|actions|db|hooks|lib|services|property)'",
    "test:integration": "jest --testPathPattern='__tests__/integration'",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed",
    "test:coverage": "jest --coverage --coverageReporters=text --coverageReporters=lcov --coverageReporters=html --coverageReporters=json-summary",
    "test:ci": "jest --ci --coverage --reporters=default",
    
    "deploy:preprod": "firebase use preprod && firebase deploy",
    "deploy:prod": "firebase use prod && firebase deploy"
  }
}
```

---

# PARTIE 2 — WORKFLOW PAR FEATURE

> Une fois le projet initialisé, suivre ce workflow pour chaque feature.

---

## 0) Branching model (stable)

### Branches permanentes
- `main` : **production** (deploy prod uniquement)
- `develop` : **intégration** + **préproduction** (branche "pont")

### Branches temporaires (par feature)
- `feat/<feature>` : développement feature
- `fix/<feature>` : corrections suite à CI/QA

---

## 1) Règles strictes de collaboration

- ❌ Pas de push direct sur `develop` et `main`
- ✅ Tout passe par **Pull Request**
- ✅ `develop` et `main` sont protégées (branch protection)

### Stratégie de merge
- `feat/*` → `develop` : **Squash merge** (1 commit propre par feature)
- `develop` → `main` : PR + tag release

---

## 2) Convention de commits

Format recommandé :
- `feat(scope): ...`
- `fix(scope): ...`
- `test(scope): ...`
- `chore(ci): ...`
- `docs(...): ...`

Exemples :
- `feat(auth): implement login flow`
- `feat(properties): add property creation form`
- `test(credits): add credit purchase tests`
- `fix(search): handle empty results`
- `chore(firebase): add firestore indexes`

---

## 3) Definition of Done (DoD) — une feature est "finie" quand :

- [ ] Feature spec : dossier `documentation/feature/web/<feature>` complété
- [ ] UX/UI : fichiers `ux.md` + `ui.md` validés
- [ ] UML : diagramme d'activité + séquence (aligné sur `documentation/uml/`)
- [ ] Code : UI → hooks → services → repo/adapters (pas de logique métier dans les pages)
- [ ] Validation : schemas Zod pour formulaires/payloads
- [ ] Rules : Firestore/Storage rules à jour si impact
- [ ] Indexes : `firestore.indexes.json` à jour si nouvelles queries
- [ ] **Tests locaux** : tous les tests passent en local (`npm lint`, `npm typecheck`, `npm test --run`, `npm build`)
- [ ] Tests : unit + component + integration (minimum) + rules tests si impact
- [ ] **Mocks** : mocks MSW créés pour les appels API (Firebase, Algolia, Functions) si nécessaire
- [ ] **Mocks** : mocks inutilisés purgés (vérification avant commit)
- [ ] **Tests E2E locaux** : tests E2E passent pour les flows critiques (auth, property creation, credit purchase) avec Firebase Cloud
- [ ] CI : pipeline vert (incluant tests E2E si configurés)
- [ ] Préprod : test manuel rapide sur préprod (smoke)
- [ ] **Tests E2E préprod** : tests E2E passent en préprod avec la vraie base de données Firebase (OBLIGATOIRE)
- [ ] **Tests règles Firestore préprod** : tests des règles passent en préprod avec la vraie base de données (OBLIGATOIRE)
- [ ] Annuaire : feature marquée comme "✅ Réalisée" dans l'annuaire

---

## 4) Workflow complet (par feature)

### Étape A — Sélectionner une feature

#### Source des features
Les features à implémenter sont **issues des diagrammes de cas d'utilisation UML** :
- `documentation/uml/use-cases-visiteur.puml` — Fonctionnalités visiteur
- `documentation/uml/use-cases-utilisateur.puml` — Fonctionnalités utilisateur
- `documentation/uml/use-cases-recherche.puml` — Fonctionnalités de recherche
- `documentation/uml/use-cases-annonceur.puml` — Fonctionnalités annonceur
- `documentation/uml/use-cases-credits.puml` — Système de crédits
- `documentation/uml/use-cases-administrateur.puml` — Fonctionnalités admin

#### Annuaire des features
Maintenir à jour le fichier `documentation/feature/ANNUAIRE.md` :

```markdown
# Annuaire des features

## Légende
- ⬜ Non commencée
- 🔄 En cours
- ✅ Réalisée
- ❌ Annulée / Reportée

## Authentification
| Feature | Statut | Branche | Date | Notes |
|---------|--------|---------|------|-------|
| Se connecter | ✅ | feat/auth-login | 2025-01-10 | - |
| S'inscrire | 🔄 | feat/auth-register | - | En cours |
| Devenir Annonceur | ⬜ | - | - | Migration Utilisateur → Annonceur |

## Propriétés
| Feature | Statut | Branche | Date | Notes |
|---------|--------|---------|------|-------|
| Créer une annonce | ⬜ | - | - | - |
| Modifier une annonce | ⬜ | - | - | - |
| Promouvoir une annonce | ⬜ | - | - | - |

## Recherche
| Feature | Statut | Branche | Date | Notes |
|---------|--------|---------|------|-------|
| Recherche avancée | ⬜ | - | - | - |
| Filtres | ⬜ | - | - | - |
| Carte interactive | ⬜ | - | - | - |

## Crédits
| Feature | Statut | Branche | Date | Notes |
|---------|--------|---------|------|-------|
| Acheter des crédits | ⬜ | - | - | - |
| Consulter solde | ⬜ | - | - | - |
| Historique transactions | ⬜ | - | - | - |
```

---

### Étape B — Analyse & conception (obligatoire)

#### B.1) Créer le dossier de la feature

**Structure obligatoire** :
```
documentation/feature/web/<nom-feature>/
├── README.md           # Fiche feature (objectif, scope, critères)
├── activity.puml       # Diagramme d'activité
├── sequence.puml       # Diagramme de séquence
├── ux.md               # Spécifications UX (parcours, interactions)
├── ui.md               # Spécifications UI (design, composants)
└── notes.md            # Notes techniques (optionnel)
```

**Exemples de dossiers** :
- `documentation/feature/web/se-connecter/`
- `documentation/feature/web/creer-annonce/`
- `documentation/feature/web/recherche-proprietes/`
- `documentation/feature/web/acheter-credits/`

#### B.2) Consulter la documentation existante

**Obligatoire — Lire les index** :
- `documentation/uml/README.md` — Diagrammes UML
- `documentation/uml/PLAN_RESTRUCTURATION.md` — Plan de restructuration
- `documentation/uml/ANALYSE_PROBLEMES.md` — Problèmes identifiés

**Vérifier la cohérence avec** :
- Les use cases UML existants
- Le modèle de données Firestore (`class-diagram.puml`)
- Les règles de sécurité

#### B.3) Spécifications UX (`ux.md`)

Le fichier `ux.md` décrit le **parcours utilisateur** et les **interactions** :

```markdown
# UX — [Nom de la feature]

## Parcours utilisateur
1. L'utilisateur arrive sur la page `/login`
2. Il voit le formulaire de connexion
3. Il saisit son email/téléphone et mot de passe
4. Il clique sur "Se connecter"
5. En cas de succès : redirection vers `/dashboard`
6. En cas d'erreur : message d'erreur inline

## États de l'interface
- **État initial** : formulaire vide, bouton désactivé
- **État saisie** : validation en temps réel, bouton activé si valide
- **État loading** : bouton disabled + spinner
- **État succès** : redirection + toast
- **État erreur** : message d'erreur sous le champ concerné

## Interactions
- Focus auto sur le premier champ
- Navigation clavier (Tab entre les champs)
- Enter = submit si valide
- Lien "Mot de passe oublié" visible

## Accessibilité
- Labels explicites pour screen readers
- Contrast ratio minimum 4.5:1
- Messages d'erreur associés aux champs (aria-describedby)
```

#### B.4) Spécifications UI (`ui.md`)

Le fichier `ui.md` décrit le **design visuel** avec précision :

```markdown
# UI — [Nom de la feature]

## Vue d'ensemble
Page de connexion simple, centrée, avec branding visible.

## Structure de la page

### Container principal
- Centré verticalement et horizontalement
- Max-width : 400px
- Padding : 32px
- Background : card avec shadow-md
- Border-radius : 16px

### Header
- Logo : 48x48px, centré
- Titre : "Connexion" — font-semibold, text-2xl
- Sous-titre : "Accédez à votre espace" — text-muted-foreground, text-sm
- Espacement : gap-4

### Formulaire
**Champ Email/Téléphone**
- Label : "Email ou téléphone"
- Input : shadcn Input, full-width
- Placeholder : "exemple@email.com"
- Validation : border-destructive si erreur

**Champ Mot de passe**
- Label : "Mot de passe"
- Input : shadcn Input type="password"
- Toggle visibility : Eye/EyeOff icon
- Espacement : mt-4

**Bouton submit**
- shadcn Button variant="default"
- Full-width
- Texte : "Se connecter"
- État loading : Loader2 icon + "Connexion..."
- Espacement : mt-6

## Responsive
- **Mobile** (< 640px) : padding réduit, full-width
- **Desktop** : centré avec max-width

## Animations
- Fade-in au chargement (duration: 300ms, ease-out)
- Shake sur erreur (duration: 200ms)
- Button scale on hover (scale: 1.02)
```

#### B.5) Diagrammes UML

**Diagramme d'activité** (`activity.puml`)
- Décrit le flux métier de la feature
- États, décisions, actions

**Diagramme de séquence** (`sequence.puml`)
- Interactions entre composants : UI → Service → Repository → Firebase
- Messages et réponses

---

### Étape C — Créer une branche Git

Depuis `develop` :
```bash
git checkout develop
git pull
git checkout -b feat/<feature>
```

**Convention de nommage** :
- `feat/auth-login` — Connexion
- `feat/auth-register` — Inscription
- `feat/auth-become-announcer` — Devenir Annonceur
- `feat/properties-create` — Créer une annonce
- `feat/properties-edit` — Modifier une annonce
- `feat/search-advanced` — Recherche avancée
- `feat/credits-purchase` — Acheter des crédits
- `feat/credits-wallet` — Gestion du portefeuille

---

### Étape D — Implémenter la feature

#### D.1) Suivre strictement la documentation feature

L'implémentation doit **correspondre exactement** à ce qui est décrit dans :
- `documentation/feature/web/<feature>/ux.md` — Parcours et interactions
- `documentation/feature/web/<feature>/ui.md` — Design et composants
- `documentation/feature/web/<feature>/sequence.puml` — Architecture technique

#### D.2) Règles d'architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    app/ (pages Next.js)                     │
│                      Vue seulement                          │
│                   Pas de logique métier                     │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    features/<domain>/hooks/                 │
│              Orchestration (React Query, state)             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   features/<domain>/services/               │
│         Logique métier (validation, mapping DTO)            │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     services/firebase/                      │
│               Repos/Adapters (Firestore/Auth/Storage)       │
└─────────────────────────────────────────────────────────────┘
```

**Règles strictes** :
- ❌ Pas de "Firebase calls" directs dans des composants UI
- ❌ Pas de logique métier dans les pages `app/`
- ✅ Pages = composition de composants + hooks
- ✅ Services = validation, transformation, workflows
- ✅ Repos = accès données (Firestore, Storage, Auth)

#### D.3) Versioning des composants (OBLIGATOIRE)

**⚠️ RÈGLE CRITIQUE** : **Tous les composants doivent être versionnés pour faciliter l'évolution du code**

**Stratégie de versioning** :
- Tous les composants créés sont **V1 par défaut** (version initiale)
- Structure : `src/shared/ui/v1/` et `src/features/<domain>/ui/v1/`
- Permet d'ajouter V2, V3, etc. sans casser le code existant

**Design Pattern : Exporteur versionné**

Créer un fichier `src/shared/ui/index.ts` qui sélectionne la version active :

```typescript
// src/shared/ui/index.ts
const VERSION_ACTIVE = process.env.NEXT_PUBLIC_UI_VERSION || 'v1';

if (VERSION_ACTIVE === 'v1') {
  export * from './v1';
} else if (VERSION_ACTIVE === 'v2') {
  export * from './v2';
} else {
  export * from './v1';
}
```

**Exemple d'utilisation** :
```typescript
// ✅ BON : Import depuis l'exporteur principal (versionné)
import { Button, Card, Input } from '@/shared/ui';

// ❌ MAUVAIS : Import direct depuis v1
import { Button } from '@/shared/ui/v1/Button';
```

#### D.4) Checklist implémentation

- [ ] Respecte `ui.md` (design, composants, animations)
- [ ] Respecte `ux.md` (parcours, états, interactions)
- [ ] **Composants créés dans `v1/`** (versioning respecté)
- [ ] **Export depuis l'exporteur versionné** (`shared/ui/index.ts`)
- [ ] Schemas Zod pour validation
- [ ] Gestion des erreurs (try/catch, error states)
- [ ] Loading states
- [ ] Responsive (mobile-first)
- [ ] **Mocks MSW créés** pour les appels API si nécessaire

---

### Étape D.5) Gestion des mocks (MSW)

**⚠️ RÈGLE CRITIQUE** : **Les mocks doivent être créés, maintenus et purgés régulièrement**

**Stratégie de mocking** :
- Utiliser **MSW (Mock Service Worker)** pour mocker les appels réseau
- Mocks dans `src/__mocks__/handlers/` organisés par domaine
- Fixtures dans `src/tests/fixtures/` pour les données de test

**Purger les mocks inutilisés** :

**⚠️ OBLIGATOIRE avant chaque commit** : Vérifier et supprimer les mocks non utilisés

**Checklist de purge (avant commit)** :
- [ ] Tous les handlers sont utilisés dans au moins un test
- [ ] Les handlers obsolètes ont été supprimés
- [ ] Les fixtures inutilisées ont été supprimées
- [ ] Les tests passent après la purge

---

### Étape D.6) Approche de développement : TDD et Test-after

**On utilise les deux approches** selon le contexte :

#### A. TDD (Test-Driven Development) — Tests avant le code

**Quand utiliser TDD** :
- ✅ Logique métier complexe (services, validation)
- ✅ Fonctions pures (utilitaires, helpers)
- ✅ Schemas Zod (validation)
- ✅ Repositories (accès données)

**Exemples** :
- `features/auth/services/auth.service.ts` → Tests avant
- `features/properties/services/property.service.ts` → Tests avant
- `shared/lib/formatMoney.ts` → Tests avant

#### B. Test-after — Tests après le code

**Quand utiliser Test-after** :
- ✅ UI/UX à itérer rapidement (composants React)
- ✅ Prototypage et exploration
- ✅ Pages et layouts (intégration Next.js)

**Exemples** :
- `features/auth/ui/LoginForm.tsx` → Code d'abord, tests après
- `app/(dashboard)/dashboard/page.tsx` → Code d'abord, tests après

**Règle absolue** : **Tous les tests doivent être écrits avant le commit final**, que ce soit avec TDD ou Test-after.

---

### Étape E — Tests locaux (OBLIGATOIRE avant commit)

**⚠️ RÈGLE CRITIQUE** : **Aucun commit/push si les tests échouent localement**

Avant chaque commit, exécuter en local :

```bash
# 1. Linter
npm run lint

# 2. Type check
npm run typecheck

# 3. Tests unitaires/component/integration (mockés - rapides)
npm run test --run

# 4. Build (vérifier que ça compile)
npm run build

# 5. Tests E2E locaux (OBLIGATOIRE pour les flows critiques)
# Prérequis : connexion à Firebase Cloud (collections -dev)
npm run test:e2e
```

**⚠️ IMPORTANT — Tests E2E locaux** :
- **Obligatoires** pour les flows critiques (authentification, création propriété, achat crédits, etc.)
- **Optionnels** pour les features simples (affichage de contenu statique)
- Utilisent la **vraie base de données Firebase Cloud** (collections `-dev`)
- Testent dans un vrai navigateur avec Firebase Cloud

**Règle absolue** :
- ✅ **Si tous les tests passent** (unitaires + E2E locaux si applicable) → Commit et push autorisés
- ❌ **Si un test échoue** → Corriger avant de commit/push

---

### Étape F — Commits & push (après tests locaux OK)

**Uniquement si tous les tests locaux passent** :

```bash
git add .
git commit -m "feat(scope): ..."
git push -u origin feat/<feature>
```

---

### Étape H — PR vers `develop` (gating CI)

Créer une PR `feat/<feature>` → `develop`.

**⚠️ RÈGLE CRITIQUE** : **Aucun merge possible si les tests échouent**

Checklist PR :
- [ ] Dossier feature complet (`documentation/feature/web/<feature>/`)
- [ ] UML ajoutés / à jour
- [ ] Tests ajoutés (unit, component, integration minimum)
- [ ] **Mocks MSW créés** pour les appels API si nécessaire
- [ ] **Mocks inutilisés purgés** (vérification effectuée)
- [ ] **Tests E2E ajoutés** pour les flows critiques
- [ ] Rules/indexes mis à jour si nécessaire
- [ ] **CI vert (tous les tests passent, incluant E2E)** ← **OBLIGATOIRE**
- [ ] Annuaire mis à jour

**Processus automatique GitHub Actions** :
1. PR créée → Workflow `pr-checks.yml` s'exécute
2. Exécution de tous les tests :
   - Lint (ESLint)
   - Type check (TypeScript)
   - Tests unitaires (Jest - mockés)
   - Build Next.js
   - **Tests E2E** (Playwright avec Firebase Cloud)
3. **Si un seul test échoue** → ❌ PR bloquée, merge impossible
4. **Si tous les tests passent** → ✅ PR peut être mergée

---

### Étape I — Merge vers `develop` + Déploiement préprod

**⚠️ RÈGLE CRITIQUE** : **Le déploiement ne se fait QUE si tous les tests réussissent**

**Processus automatique après merge** :

1. **Phase Tests (OBLIGATOIRE)** :
   - Workflow `ci.yml` s'exécute automatiquement sur `develop`
   - Exécution de tous les tests (incluant E2E)
   - **Si un test échoue** → ❌ **Déploiement annulé**, alerte envoyée

2. **Phase Déploiement (seulement si tests OK)** :
   - Workflow `deploy-preprod.yml` s'exécute **uniquement si** `ci.yml` est vert
   - Déploiement automatique vers **préprod** :
     - Firestore Rules
     - Firestore Indexes
     - Storage Rules
     - Cloud Functions

---

### Étape J — Validation préprod (smoke test)

Sur préprod :
- vérifier 2–3 parcours critiques
- regarder logs Functions si nouveau trigger

**Si OK** : on passe à l'étape J.1 (tests E2E en preprod).  
**Si problème** : corriger sur `develop`, re-déployer en préprod.

---

### Étape J.1 — Tests E2E en préprod (OBLIGATOIRE avant prod)

**⚠️ RÈGLE CRITIQUE** : **Aucune feature ne peut être mise en production sans tests E2E réussis en préprod**

**Objectif** : Valider que la feature fonctionne avec la **vraie base de données Firebase en préprod**.

#### Processus de tests E2E en préprod

**1. Configuration de l'environnement de test** :

Créer un fichier `.env.preprod.test` (gitignored) avec les variables préprod.

**2. Build Next.js avec variables préprod** :
```bash
export $(cat .env.preprod.test | xargs)
npm run build
```

**3. Tests E2E avec base de données réelle** :
```bash
# Tests E2E en préprod (CRITIQUE)
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false npm run test:e2e:preprod

# Tests des règles Firestore en préprod (CRITIQUE)
npm run test:firestore:preprod
```

**4. Checklist des tests E2E en préprod** :

- [ ] **Tests de règles Firestore** : Tous les cas de figure testés avec la vraie base
- [ ] **Tests E2E complets** : Tous les flows critiques testés
- [ ] **Tests d'intégration** : Vérification des interactions réelles

**5. Règle absolue** :
- ✅ **Si tous les tests E2E passent en préprod** → Feature prête pour production
- ❌ **Si un test échoue en préprod** → Corriger, re-déployer, re-tester

---

### Étape K — Release vers `main` (prod)

**⚠️ RÈGLE CRITIQUE** : **Même processus que develop → Aucun déploiement si tests échouent**

Créer une PR `develop` → `main`.

**Processus automatique** :

1. **Phase Tests PR (OBLIGATOIRE)** :
   - Workflow `pr-checks.yml` s'exécute sur la PR
   - Exécution de tous les tests (incluant E2E)
   - **Si un test échoue** → ❌ PR bloquée, merge impossible

2. **Phase Merge** :
   - **Seulement si tous les tests passent** → Merge possible

3. **Phase Tests Post-Merge (OBLIGATOIRE)** :
   - Workflow `ci.yml` s'exécute automatiquement sur `main`
   - Exécution de tous les tests (incluant E2E)
   - **Si un test échoue** → ❌ **Déploiement annulé**, rollback possible

4. **Phase Déploiement Prod (seulement si tests OK)** :
   - Workflow `deploy-prod.yml` s'exécute **uniquement si** `ci.yml` est vert (incluant E2E)
   - Déploiement automatique vers **prod**
   - Création d'un tag Git `vX.Y.Z`
   - Annuaire : marquer feature comme "✅ Réalisée"

---

## 5) Pipelines CI/CD (exigences)

### ⚠️ RÈGLE FONDAMENTALE : Tests avant déploiement

**AUCUN DÉPLOIEMENT N'EST POSSIBLE SI UN SEUL TEST ÉCHOUE**

Le processus est toujours le même :
1. **Tests d'abord** (obligatoire)
2. **Déploiement ensuite** (seulement si tous les tests passent)

---

### CI PR (sur chaque PR vers develop/main)

**Déclenchement** : Toute Pull Request vers `develop` ou `main`

**Workflow** : `.github/workflows/test.yml` (déjà configuré)

**Actions exécutées** (dans l'ordre) :
1. `lint` (ESLint)
2. `typecheck` (TypeScript)
3. Tests unitaires (Jest - mockés)
4. Build Next.js
5. **Tests E2E** (Playwright avec Firebase Cloud) — **OBLIGATOIRE pour flows critiques**

**Règle absolue** : 
- ✅ **Si tous les tests passent** (incluant E2E) → PR peut être mergée
- ❌ **Si un seul test échoue** → PR bloquée, merge impossible

---

### CI Post-Merge (sur `develop` et `main`)

**Déclenchement** : Push direct sur `develop` ou `main` (après merge)

**Workflow** : `.github/workflows/test.yml`

**Actions exécutées** (dans l'ordre) :
1. `lint` (ESLint)
2. `typecheck` (TypeScript)
3. Tests unitaires (Jest - mockés)
4. Build Next.js
5. **Tests E2E** (Playwright avec Firebase Cloud)
6. Upload coverage (Codecov)

**Règle absolue** :
- ✅ **Si tous les tests passent** (incluant E2E) → Déploiement déclenché
- ❌ **Si un test échoue** → **Déploiement annulé**, alerte envoyée

---

### CD Préprod (sur `develop`)

**Déclenchement** : **Uniquement si** `ci.yml` est vert (tous les tests passent)

**Workflow** : `deploy-preprod.yml` (à créer)

**Dépendance** : `needs: test` (dépend du job test de `ci.yml`)

**Actions exécutées** :
1. Vérification que les tests ont réussi (incluant E2E)
2. Build Next.js
3. Déploiement Firebase :
   - `firestore:rules`
   - `firestore:indexes`
   - `storage`
   - `functions`

---

### CD Prod (sur `main`)

**Déclenchement** : **Uniquement si** `ci.yml` est vert (tous les tests passent)

**Workflow** : `deploy-prod.yml` (à créer)

**Dépendance** : Tests doivent passer avant déploiement

**Actions exécutées** :
1. Vérification que les tests ont réussi (incluant E2E)
2. Build Next.js
3. Déploiement Firebase :
   - `firestore:rules`
   - `firestore:indexes`
   - `storage`
   - `functions`
4. Création d'un tag Git `vX.Y.Z`
5. Monitoring/alerts actifs

---

## 6) Gestion Rules & Indexes (Firebase)

### Fichiers versionnés
- `firestore.rules`
- `firestore.indexes.json`
- `storage.rules`

### Déploiement
Préprod :
```bash
firebase use preprod
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

Prod :
```bash
firebase use prod
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

---

## 7) Gestion des variables d'environnement

### Stratégie multi-environnement

#### Fichiers locaux (gitignored)
```
.env.local              # Variables locales (dev)
.env.development        # Override dev
.env.production         # Override prod (pour build local)
```

#### Variables requises
```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Algolia (client - public)
NEXT_PUBLIC_ALGOLIA_APP_ID=
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=

# Airtel Money
NEXT_PUBLIC_AGENT_CODE_AIRTEL=

# Optionnel
NEXT_PUBLIC_APP_ENV=development|preprod|production
NEXT_PUBLIC_UI_VERSION=v1|v2  # Version des composants UI (v1 par défaut)
```

---

## 8) Tests — Stratégie robuste et complète

### 8.1) Organisation des fichiers de tests

#### Next.js
- **unit/component** : `__tests__/**/*.test.ts(x)` — Tests mockés (rapides)
- **integration** : `__tests__/integration/*.test.ts` — Tests mockés (rapides)
- **e2e** : `__tests__/e2e/**/*.spec.ts` — Tests E2E avec Playwright (Firebase Cloud)

#### Firebase
- rules : `firebase/tests/rules/*.test.ts`
- functions unit : `functions/test/unit/*.test.ts`
- functions integration (emulator) : `functions/test/integration/*.test.ts`

---

### 8.2) Couverture de code — Configuration et seuils

**⚠️ RÈGLE CRITIQUE** : **La couverture de code ne doit JAMAIS baisser entre deux commits**

#### Configuration Jest pour la couverture

**`jest.config.ts`** (déjà configuré) :
- `collectCoverage: true`
- `coverageDirectory: "__tests__/coverage"`
- Seuils à définir (objectif: 70% minimum)

#### Scripts de couverture

```json
{
  "scripts": {
    "test:coverage": "jest --coverage",
    "test:coverage:check": "jest --coverage --coverageThreshold='{\"global\":{\"branches\":70,\"functions\":70,\"lines\":70,\"statements\":70}}'"
  }
}
```

---

### 8.3) Tests E2E — Configuration multi-navigateurs et viewports

**⚠️ RÈGLE CRITIQUE** : **Les tests E2E doivent couvrir plusieurs navigateurs ET plusieurs tailles d'écran**

#### Configuration Playwright complète

**`playwright.config.ts`** (à créer) :

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  timeout: 30 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  // ⚠️ MULTI-NAVIGATEURS + MULTI-VIEWPORTS OBLIGATOIRE
  projects: [
    // Desktop
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'], viewport: { width: 1920, height: 1080 } },
    },
    
    // Tablette
    {
      name: 'chromium-tablet',
      use: { ...devices['iPad Pro'] },
    },
    
    // Mobile
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 9) Exemple complet — Feature "Se connecter"

### Dossier feature
```
documentation/feature/web/se-connecter/
├── README.md           # Fiche feature
├── activity.puml       # Flux : saisie → validation → auth → redirect
├── sequence.puml       # UI → AuthService → FirebaseAuth → UserRepo
├── ux.md               # Parcours, états, interactions
├── ui.md               # Design, composants, animations
└── notes.md            # Notes techniques
```

### Branches
- `feat/auth-login`

### Tests minimum
- unit : `login.schema.test.ts` (validation Zod)
- component : `LoginForm.test.tsx` (tests mockés)
- integration : `login.integration.test.ts` (tests mockés)
- **e2e** : `__tests__/e2e/auth/login.spec.ts` (tests E2E avec Firebase Cloud) — **OBLIGATOIRE**
- rules : user lit son profil, pas celui d'un autre

### Mocks
- Handlers MSW créés dans `src/__mocks__/handlers/auth.handlers.ts`
- Fixtures dans `src/tests/fixtures/users.fixture.ts`
- Mocks inutilisés purgés avant commit

### Versioning
- Composants créés dans `features/auth/ui/v1/`
- Export depuis l'exporteur versionné (`shared/ui/index.ts`)

### Déploiement
- merge develop → auto deploy préprod
- PR main → deploy prod
- Annuaire : ✅ Réalisée

---

## 10) Checklist "go/no-go" avant prod
- [ ] préprod OK (smoke test manuel)
- [ ] **Tests E2E passent** avec Firebase Cloud dev (local)
- [ ] **Tests E2E passent en préprod** avec la vraie base de données Firebase (OBLIGATOIRE)
- [ ] **Tests des règles Firestore passent en préprod** avec la vraie base de données (OBLIGATOIRE)
- [ ] Build Next.js réussi avec variables préprod
- [ ] logs functions clean
- [ ] indexes construits
- [ ] rules testées (émulateurs + préprod)
- [ ] variables d'env prod vérifiées
- [ ] rollback plan (revert PR ou tag précédent)
- [ ] annuaire mis à jour

---

## 11) Structure complète documentation/feature/

```
documentation/feature/
├── ANNUAIRE.md                    # Suivi de toutes les features
│
└── web/                           # Features Web (Next.js)
    ├── se-connecter/              # Feature : Connexion
    │   ├── README.md
    │   ├── activity.puml
    │   ├── sequence.puml
    │   ├── ux.md
    │   └── ui.md
    │
    ├── s-inscrire/                # Feature : Inscription
    │   └── ...
    │
    ├── devenir-annonceur/         # Feature : Migration Utilisateur → Annonceur
    │   └── ...
    │
    ├── creer-annonce/             # Feature : Créer une annonce
    │   └── ...
    │
    ├── rechercher-proprietes/     # Feature : Recherche de propriétés
    │   └── ...
    │
    ├── acheter-credits/           # Feature : Acheter des crédits
    │   └── ...
    │
    └── promouvoir-annonce/        # Feature : Promouvoir une annonce
        └── ...
```

---

*Document créé le : 2026-01-12*  
*Version : 1.0*  
*Adapté pour : Plateforme Location Maison Gabon*

