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

---

## 🟢 Corrigé — Une annonce promue ne l'affiche jamais côté client (bug sévère)

**Statut** : corrigé, vérifié pour les 4 types de promotion.

**Repro initial** : promouvoir une annonce (n'importe quel type) depuis `/property` —
paiement des crédits réel, transaction Firestore réelle, toast "Promotion activée !"
affiché. Mais la carte de l'annonce continue d'afficher le bouton "Promouvoir" au lieu de
"À la une"/"En tendance"/"Boostée" — **même après un rechargement complet de la page**. Le
stat "Promues" reste à 0. Réouvrir la modale ne montre jamais le bandeau "Promotion active",
et rien n'empêche (côté UI) de payer une seconde fois pour le même type de promotion déjà
active — seul un filet de sécurité serveur (`hasActiveSamePromotion` dans
`/api/property/promote/route.ts`, qui lit le Timestamp Firestore brut, pas le JSON) empêche
la double-facturation, mais l'utilisateur n'a aucun moyen de le savoir en regardant la page.

**Cause** : le SDK Admin Firebase sérialise ses `Timestamp` en JSON avec un préfixe
underscore — `{"_seconds": ..., "_nanoseconds": ...}` (vérifié directement :
`JSON.stringify(admin.firestore.Timestamp.now())`). `/api/announcer/ads/route.ts` renvoie les
propriétés telles quelles depuis `doc.data()`. Mais tout le code client qui décide si une
promotion est active lit `currentPromotion.endDate.seconds` **sans underscore** — le SDK
client Firebase, lui, expose bien `.seconds` — dans trois fichiers distincts :
`PromotionButton.tsx`, `PromotionBadge.tsx`, `use-promotion.ts` (`hasActivePromotion`,
`getPromotionStatus`, `canPromote`). Résultat : `endDate.seconds` vaut `undefined` pour toute
donnée passée par cette route, `new Date(undefined * 1000)` est une date invalide, et
`hasActivePromotion` vaut donc toujours `false` — quelle que soit la réalité en base.

**Correctif** : normalisation à la source, dans `/api/announcer/ads/route.ts` — une fonction
`serializeProperty`/`serializeTimestamp` convertit `currentPromotion.startDate`/`endDate` en
`{ seconds, nanoseconds }` (sans underscore) juste avant `NextResponse.json`, en s'appuyant
sur la méthode `.toMillis()` déjà disponible sur l'objet Timestamp brut à ce stade. Un seul
point de correction plutôt que de toucher les 3 fichiers client. Portée volontairement limitée
à cette route (celle réellement testée) — la route publique `/api/property/promoted` n'a pas
été vérifiée, possiblement concernée par le même bug si elle sérialise `currentPromotion` de
la même façon.

**Fichier** : `apps/location-maison/src/app/api/announcer/ads/route.ts`.

**Bug additionnel corrigé au passage** : `usePromotion`'s `onSuccess` invalidait
`queryClient` avec la clé `['user-properties']`, qui ne correspond à aucune query existante
dans tout le codebase (vérifié par recherche globale) — donc sans effet. La vraie clé de la
liste `/property` est `'announcer-ad-management'` (`AD_QUERY_KEY` dans
`useAdManagement.ts`, déjà utilisée correctement ailleurs dans ce même hook pour d'autres
actions). Corrigé dans `src/hooks/use-promotion.ts`. Ce correctif seul n'aurait pas suffi
sans celui du Timestamp ci-dessus — les deux bugs se superposaient sur le même symptôme.

**Non vérifié** : si ce même bug de sérialisation affecte l'affichage des annonces promues
ailleurs dans l'app (page d'accueil, page détail publique d'une annonce) — routes différentes,
non auditées cette session.

**Test qui le prouve** : `apps/location-maison/__tests__/e2e/property-promotion.spec.ts`,
6 tests, un par type de promotion (featured, trending-7d, trending-3d, boost) + le blocage
de re-sélection d'une promotion déjà active + les crédits insuffisants. Vrai paiement en
crédits via de vrais comptes Firestore (`seedAnnouncerUser`), vraie transaction
`/api/property/promote`.

**Particularité du type "boost"** (pas un bug, un constat) : `duration: 0` par design
(`PROMOTION_CONFIGS`) — `endDate === startDate`, donc `hasActivePromotion()` ne peut
structurellement jamais être vrai pour ce type. Le bouton "Boostée" dans
`PromotionButton.tsx` (`case 'boost': return 'Boostée'`) est du code mort : cette branche ne
peut jamais s'exécuter en pratique. Le boost fonctionne bien (remonte l'annonce en tête de
liste via `sortTimestamp`), mais n'affiche jamais de badge/état persistant — cohérent avec sa
description ("remise à jour instantanée"), mais le libellé "Boostée" laisse penser à tort
qu'un état visuel devrait apparaître. Non corrigé (cosmétique, pas de vrai bug fonctionnel).

*Créé le 2026-08-29, mis à jour le même jour suite au test complet des 4 types de promotion.*
