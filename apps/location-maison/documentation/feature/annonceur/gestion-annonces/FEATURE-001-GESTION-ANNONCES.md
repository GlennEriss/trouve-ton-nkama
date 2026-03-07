# FEATURE-001 - Gestion des Annonces Annonceur

## 1. Contexte

La page annonceur actuelle est `GET /property` (entrypoint `src/app/(protected)/property/page.tsx`).

Objectif de cette feature:

- transformer `/property` en vrai cockpit de pilotage annonceur
- corriger les faiblesses UX/UI mobile/tablette/desktop
- fiabiliser la pagination et les interactions liste/filtres/stats
- poser une architecture feature-based claire pour les evolutions futures

References:

- `documentation/uml/use-cases-annonceur.puml`
- `documentation/feature/ANNUAIRE.md`
- `src/components/property/PropertyList.tsx`
- `src/components/property/ListPropertySection.tsx`
- `src/components/property/PropertyFilter.tsx`
- `src/components/property/PropertyStatistics.tsx`
- `src/db/property.db.ts`

## 2. Diagnostic critique de la page actuelle `/property`

## 2.1 UX / UI globale

- direction visuelle incoherente avec le reste de la plateforme (densite elevee, surcharge d'effets, hierarchie faible).
- animations presentes mais souvent decoratives, peu au service des taches critiques (recherche, tri, action rapide).
- structure cognitive faible: stats, filtres et liste sont juxtaposes sans priorisation claire des objectifs annonceur.

## 2.2 Mobile (point critique)

- header sticky en double etat (expanded/compact) trop volumineux, perd de l'espace utile et cree une perception de "saut" visuel.
- cartes chargees (badges + switch + actions + promotion) avec densite trop forte pour petit ecran.
- actions importantes non prioritaires dans la lecture mobile (edition, voir, suppression, promotion en concurrence).
- pagination "precedent/suivant" peu naturelle sur mobile (attente d'un scroll continu ou "load more" contextualise).

## 2.3 Tablette / Desktop

- grille variable sans vraie strategie de lecture par priorite metier.
- manque de barre de recherche (titre/description/localisation) pour retrouver vite une annonce.
- filtres limites au `type`, sans statut, disponibilite, date, prix, performance, promotion, etc.
- stats "nombre brut par type" trop basiques, sans indicateur de performance ou tendance.

## 2.4 Donnees et logique metier (constats code)

- `getProperties` ne gere que `createdBy + type + createdAt desc`:
  - pas de recherche textuelle
  - pas de tri multi-critere
  - pas de filtres metier riches
- stats construites via plusieurs `getCountFromServer` (N requetes par type), couteuses et peu evolutives.
- pagination manuelle par index (`currentPage`) + `fetchNextPage`:
  - feedback faible au changement de page
  - UX decalee sur mobile
  - risque d'etats incoherents lors des changements de filtre/utilisateur

## 2.5 Accessibilite et ergonomie

- signal visuel fort, mais peu d'aides contextuelles "metier".
- peu d'etats vides explicatifs orientes action ("quoi faire ensuite").
- information de statut annonce (active/archivee/promotion) pas assez structurée pour pilotage rapide.

## 3. Vision cible

Faire de `/property` un tableau de bord annonceur:

- **retrouver vite** une annonce (search + filtres + tri)
- **agir vite** (activer/desactiver, editer, supprimer, promouvoir)
- **comprendre vite** la performance (stats actionnables, pas juste des compteurs)
- **naviguer fluidement** (mobile first, pagination/infinite propre, transitions utiles)

## 4. Scope fonctionnel V1 (refonte)

1. Barre de recherche
- recherche locale/server sur `title`, `description`, `city`, `province`.

2. Filtres utiles
- type de bien
- statut business (location/vente)
- etat annonce (active/archivee)
- plage de prix
- periode de publication
- promotion active (oui/non)

3. Tri
- plus recentes
- plus anciennes
- prix croissant/decroissant
- plus vues (si metrique disponible)

4. Stats annonceur utiles
- total annonces
- annonces actives vs archivees
- annonces promues
- vues / contacts (sur periode)
- taux de contact (si disponible)

5. Liste et cartes
- cartes harmonisees par viewport
- actions primaires explicites
- actions secondaires contextualisees
- feedback clair sur operation async (loading/success/error)

6. Pagination/chargement
- mobile/tablette: infinite scroll ou load-more progressif
- desktop: pagination claire ou infinite unifiee (pas de double paradigme)

## 5. Architecture cible (feature-based)

Creer un module dedie:

- `src/features/announcer/ad-management/services/`
- `src/features/announcer/ad-management/hooks/`
- `src/features/announcer/ad-management/ui/v1/`
- `src/features/announcer/ad-management/__tests__/`

Regles:

- `app/(protected)/property/page.tsx` reste un entrypoint mince
- logique metier extraite des composants historiques `src/components/property/*`
- acces donnees centralise via services/repositories (pas de logique de requetage dispersee)

## 6. API et modele de donnees (cible V1)

Evoluer la lecture des annonces annonceur avec params standardises:

- `q` (texte libre)
- `type`
- `status` (FOR_RENT / FOR_SALE)
- `state` (IN_PROGRESS / ARCHIVED)
- `priceMin`, `priceMax`
- `sortBy`, `sortOrder`
- `cursor`, `limit`

Sortie:

- `items[]`
- `nextCursor`
- `total` (ou endpoint summary dedie)
- `facets` minimales utiles (types/states)

## 7. Plan de realisation (phases)

Phase 1 - Diagnostic et spec (actuelle)
- critique de l'existant
- scope V1 valide

Phase 2 - Refonte architecture
- module `features/announcer/ad-management`
- extraction hooks/services

Phase 3 - Refonte UI/UX
- nouveau layout responsive
- recherche/filtres/tri
- cartes harmonisees + actions annonceur

Phase 4 - Stats et pagination
- stats metier utiles
- strategie pagination coherente multi-device

Phase 5 - Qualite
- tests unitaires hook/service
- tests integration composants
- tests E2E parcours annonceur (`/property`)

## 8. Criteres d'acceptation

1. Productivite annonceur
- retrouver une annonce en moins de 3 actions avec recherche + filtres.

2. Coherence UX
- rendu propre et lisible sur mobile/tablette/desktop.

3. Pilotage
- stats orientees decision (pas uniquement des volumes).

4. Fiabilite
- pagination robuste, sans etats visuels incoherents.

5. Architecture
- logique principale migree vers `src/features/announcer/ad-management`.

## 9. Hors scope immediat

- redesign complet du wizard creation (`/property/add`)
- refonte des ecrans detail stats avancees
- moteur de recherche full-text externe (Algolia/Elastic)
