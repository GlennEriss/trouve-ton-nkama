# Implementation Decisions - Tech Stack (Proche Production)

## 1. Frontend UI stack (decision finale MVP)

- Framework: `Next.js` (App Router)
- UI styling: `Tailwind CSS`
- Icônes: `lucide-react` (obligatoire et standard unique)
- Primitives accesibilite: `Radix UI` via `shadcn/ui`
- Table composante data-heavy: `@tanstack/react-table`
- Graphiques analytics: `recharts` (MVP), evolutif vers `nivo` si besoin
- Formulaires: `react-hook-form` + `zod`
- Date/time UI: `date-fns` + composants date picker shadcn

## 2. Component kit de plateforme (decision finale)

Decision: **Shadcn UI + UI Kit interne**.

Concretement:

- `shadcn/ui` sert de base technique et accesibilite.
- On cree un `UI kit admin` interne (`@/components/ui-kit/*`) qui encapsule:
- tokens design
- variantes de boutons
- tableaux admin
- cards KPI
- badges de statut
- modales de confirmation critique

Regle: aucun composant ecran metier ne consomme directement un composant heterogene hors kit.

## 3. Choix librairie composants (arbitrage)

- `shadcn/ui`: **retenu** (controle total, tokens custom, excellent fit Tailwind).
- `Chakra UI`: non retenu MVP (moins aligne avec approche shadcn + tokenisation custom prevue).
- `Origin UI`: non retenu MVP (excellent inspiration visuelle possible, mais pas source principale de composants).

## 4. Gestion d'etat globale (decision finale)

Decision: **hybride Zustand + TanStack Query + React Context minimal**.

- `TanStack Query`: server state (fetch, cache, invalidation, retries, stale time).
- `Zustand`: state client global (UI shell, filtres persistants, preferences admin, wizard state).
- `React Context`: uniquement themes/contexte applicatif transversal tres leger.

Pourquoi pas Redux:

- trop ceremonieux pour MVP admin actuel.
- on privilegie vitesse et lisibilite.

Pourquoi pas Recoil:

- ecosysteme/standardisation equipe moins robuste que Zustand+Query dans ce contexte.

## 5. Standards frontend obligatoires

- A11y: composants focusables, labels, aria, contrastes, navigation clavier.
- Etats UX standards: `loading`, `empty`, `error`, `success` sur tous les ecrans data.
- Design coherence: usage exclusif du UI kit + tokens.
- i18n readiness: aucune string metier hardcodee dans composants bas niveau.

## 6. Arborescence frontend recommandee

```text
src/
  app/
    (admin)/
  components/
    ui/                # shadcn de base
    ui-kit/            # design system interne admin
  modules/
    admin-management/
    user-management/
    listing-moderation/
    finance-credits/
    analytics-insights/
  stores/
    ui-shell.store.ts
    filters.store.ts
  lib/
    query-client.ts
    http-client.ts
```

## 7. Definition of done frontend

Une feature frontend est acceptee uniquement si:

- respecte UI kit
- respecte RBAC UI (masquage/desactivation action)
- respecte validation zod
- couvre cas `loading/error/empty`
- declenche invalidation query correcte apres mutation
