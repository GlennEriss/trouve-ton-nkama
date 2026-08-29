# Bugs découverts par les tests e2e réels de /property (2026-08)

Suite logique du travail sur l'auth : tests Playwright non-mockés (vraies annonces Firestore
via Admin SDK, pas d'interception réseau) pour la recherche et les filtres de
`/property` (Gestion des annonces). Contexte : les tests Jest existants
(`ad-management-page.test.tsx`) mockent toute la couche `useAdManagement`, donc ne prouvent
jamais que `/api/announcer/ads` (qui interroge Firestore par `createdBy` puis filtre/trie
en mémoire côté serveur) retourne les bonnes annonces.

## 🟢 Corrigé — Select piégé sous le contenu d'un Dialog/Sheet (z-index)

**Statut** : corrigé au niveau du design system partagé (`packages/ui`), vérifié.

**Repro initial** : dans le Sheet de filtres mobile de `/property`, sélectionner une valeur
dans le Select "Type" — le clic sur l'option n'aboutissait pas, Playwright rapportant
`<button id="mobile-property-state-filter">... subtree intercepts pointer events` : le champ
"État" (plus bas dans le Sheet) interceptait le clic destiné à l'option du Select "Type"
pourtant visuellement au-dessus.

**Cause** : `SelectContent`, `PopoverContent` et `DropdownMenuContent`/`SubContent`
(`packages/ui/src/components/{select,popover,dropdown-menu}.tsx`) utilisaient encore le
`z-50` par défaut de shadcn. `Dialog` et `Sheet` avaient déjà été montés à `z-[10020]`
(commentaire existant dans `dialog.tsx` : nécessaire pour dépasser la navbar sticky
`z-[9999]` et `MobileSidebar` `z-[10000]/[10001]`). Un Select/Popover/DropdownMenu ouvert
*à l'intérieur* d'un Dialog ou Sheet rend donc ses options visuellement par-dessus, mais en
dessous dans l'empilement — les clics sont absorbés par le reste du contenu du Dialog/Sheet.

**Portée** : composants du design system partagé (`@trouve-ton-nkama/ui`), potentiellement
utilisés par d'autres apps du monorepo. Repéré via le Sheet de filtres de `/property`, mais
le même risque existe pour tout Select/Popover/DropdownMenu ouvert depuis un Dialog — par
exemple le Select "Indicatif" (code pays) dans la modale de connexion téléphone
(`PhoneAuthModal`, un Dialog), non vérifié directement mais structurellement exposé au même
bug.

**Correctif** : `z-50` → `z-[10030]` (au-dessus de `z-[10020]`) sur les trois composants.
Changement purement additif côté empilement — ne peut pas casser un affichage existant,
seulement corriger les cas où un popover était piégé derrière son propre conteneur.

**Fichiers** : `packages/ui/src/components/select.tsx`,
`packages/ui/src/components/popover.tsx`, `packages/ui/src/components/dropdown-menu.tsx`.

**Test qui le prouve** : `apps/location-maison/__tests__/e2e/property-filters-search.spec.ts`,
scénario mobile "le Sheet de filtres applique le filtre Type" — échouait de façon
reproductible avant le correctif, passe après, sans contournement de timing dans le test.

---

## Couverture ajoutée — `property-filters-search.spec.ts`

11 tests, données Firestore réelles (une villa, un studio, un appartement archivé — mêmes
créateur), mobile + desktop :

- Recherche par ville, par titre, insensible à la casse
- Recherche sans résultat → état vide ("Aucune annonce trouvée")
- Bouton "Effacer la recherche" (mobile + desktop)
- Filtre Type, filtre État (actives/archivées), filtre prix minimum
- Réinitialiser (bouton desktop + Sheet mobile)
- Sheet de filtres mobile : ouverture, application d'un filtre, reset

**Pas encore couvert** (périmètre restreint à "filtres + recherche" pour ce premier passage) :
tri (`Tri` / `sortBy`), filtre Statut (Location/Vente), filtre Promotion, prix maximum,
pagination, onglet marketplace vs immobilier, catégories marketplace.

*Créé le 2026-08-29.*
