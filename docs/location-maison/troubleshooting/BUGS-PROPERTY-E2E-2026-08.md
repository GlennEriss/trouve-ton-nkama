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

---

## 🔴 Corrigé — Suppression d'une annonce bloquée 30-60s puis échoue, pour la quasi-totalité des utilisateurs

**Statut** : corrigé, vérifié. C'est le bug le plus sévère trouvé sur `/property` cette
session — touche une action cœur (supprimer une annonce), pour presque tous les
utilisateurs réels, systématiquement.

**Repro initial** : cliquer "Supprimer" → confirmer dans la boîte de dialogue → le bouton
reste bloqué sur "Suppression..." pendant **30 à 60 secondes** (mesuré à deux reprises),
puis affiche "Impossible de supprimer l'annonce." L'annonce n'est jamais supprimée. Aucune
exception, aucun crash — juste une très longue attente qui donne l'impression que le site
est figé, suivie d'un échec silencieux.

**Cause** : `deleteProperty()` (`src/db/property.db.ts`) passait par le SDK Firestore
**CLIENT** (`deleteDoc`), qui exige une vraie session Firebase Auth dans le **navigateur**
(`firestore.rules` : `allow delete: if isAnnouncer() && request.auth.uid == ...`). Or :
- Google échange son credential **côté serveur** (callback NextAuth) — jamais dans le
  navigateur.
- La connexion email/mot de passe passe par le `Credentials` provider de NextAuth, dont
  `authorize()` s'exécute lui aussi **côté serveur** (`next-auth/auth.config.ts`) — vérifié
  directement dans le code.

Aucun des deux flux de connexion "normaux" (la quasi-totalité des utilisateurs réels) ne
laisse donc le navigateur avec une vraie session Firebase Auth cliente. Seul un signup
téléphone tout juste terminé en a une (le SDK y est appelé en direct dans le navigateur),
tant qu'aucun rechargement n'a eu lieu depuis — troisième variante de la même famille de bug
que la création de compte téléphone et la finalisation de profil, déjà corrigées plus tôt
cette session. Le délai de 30-60s vient probablement d'une tentative de synchronisation
hors-ligne du SDK client avant qu'il ne remonte l'échec.

**Correctif** : nouvelle route serveur `DELETE /api/property/[id]` (Admin SDK), qui vérifie
la session NextAuth et la propriété (`createdBy`/`claimedBy`) avant de supprimer.
`deleteProperty()` appelle maintenant cette route au lieu du SDK client. Un seul point de
correction : `deleteProperty()` a deux appelants (`AdManagementPage` via
`ad-management.service.ts`, et `RemoveProperty.tsx`, un second bouton de suppression
ailleurs dans l'app) — les deux sont corrigés du même coup.

**Fichiers** : `apps/location-maison/src/app/api/property/[id]/route.ts` (nouveau),
`apps/location-maison/src/db/property.db.ts`.

**Risque identique, confirmé et corrigé plus tard le même mois** : "Archiver"
(`toggleAdState` → `updateProperty` → `updateModel`, même SDK client, mêmes `firestore.rules`
côté `update`) avait très probablement le même bug — à l'époque confirmé seulement par lecture
de code. `updateProperty()` a depuis été corrigé pour toute son utilisation (voir plus bas,
section "Les sauvegardes via les crayons ne persistaient jamais réellement"), ce qui couvre
`toggleAdState` du même coup — vérifié en e2e réel dans `property-archive.spec.ts`. Création via
`createProperty`/`createModel` n'a, elle, pas été revérifiée.

**Test qui le prouve** : `apps/location-maison/__tests__/e2e/property-delete.spec.ts` — vrai
compte Firestore, vraie annonce, suppression réelle vérifiée à la fois par l'UI (toast,
disparition de la carte) et par une relecture directe de `/api/announcer/ads` prouvant que
le document n'existe plus.

---

## 🔴 Corrigé — Bouton "Voir" sur une annonce Mode plantait la page (crash React)

**Statut** : corrigé, vérifié pour immobilier et Mode.

**Repro initial** : sur `/property`, onglet "Mode", cliquer "Voir" sur une annonce Mode
(vêtement, etc.) → page blanche, "Application error: a client-side exception has occurred".
La même annonce, vue par un visiteur externe sur `/annonce/{id}` (page publique), s'affiche
correctement.

**Cause** : `/property/{id}` (bouton "Voir" de l'annonceur, `PreviewPropertyClient.tsx`)
rend **toujours** `PreviewProperty` — le gabarit immobilier (statut à louer/vendre,
caractéristiques chambres/sdb, carte précise à la rue). La page publique équivalente
(`/annonce/{id}`, `HouseDetails.tsx`) branche elle correctement entre `PreviewProperty`
(immobilier) et `PreviewCategoryListing` (Mode/marketplace) via
`isCategoryListing = !property.typeProperty && Boolean(property.categoryId)`.
`PreviewPropertyClient.tsx` n'avait jamais cette branche. Une annonce Mode n'a jamais
`property.tags` (concept propre à l'immobilier) — `PreviewProperty.tsx` fait
`property.tags.map(...)` sans garde à la ligne 34 → `TypeError: Cannot read properties of
undefined (reading 'map')`, confirmé par la stack trace du crash en e2e réel.

**Correctif** : `PreviewPropertyClient.tsx` reprend exactement le même discriminant que
`HouseDetails.tsx` et rend `PreviewCategoryListing` pour une annonce Mode.

**Fichier** : `apps/location-maison/src/components/preview-property/PreviewPropertyClient.tsx`.

**Piste écartée en cours de route, pas un bug** : `/api/property/id` (route derrière
`useProperty`) met la réponse en cache Redis 10 minutes dès qu'une annonce est "publiquement
visible" (state IN_PROGRESS + moderationStatus APPROVED). Une annonce de test réutilisant le
même id entre plusieurs runs sert alors une réponse périmée — a fait perdre du temps de
diagnostic ici (le crash semblait persister après un premier correctif de données de test qui
avait pourtant fonctionné). Pas un bug applicatif : comportement de cache normal, juste un
piège pour des données de test à id fixe. `SimpleMap.tsx` plante aussi
("Invalid LatLng object") si une annonce immobilier n'a pas de coordonnées — pas creusé plus
loin, le vrai flux de création en fournit toujours.

**Test qui le prouve** : `apps/location-maison/__tests__/e2e/property-view.spec.ts` — une
annonce immobilière et une annonce Mode, vraies données Firestore, vérifie le bon gabarit
pour chacune (et l'absence de crash).

**Régression corrigée juste après (même cause racine)** : une fois le crash résolu, la fiche
Mode restait mal aérée en vue mobile — éléments collés aux bords, aucun padding horizontal.
`PreviewCategoryListing.tsx` n'a pas de padding propre (contrairement à `PreviewProperty`,
auto-paddé) et compte sur son conteneur pour ça — `HouseDetails.tsx` (page publique) l'enveloppe
bien de `px-4 py-4` (mobile) / `py-5 px-20` (desktop), mais ce padding n'avait pas été repris
dans le correctif ci-dessus pour `PreviewPropertyClient.tsx`. Ajouté (signalé par l'utilisateur
en repassant sur une vraie annonce après le premier correctif — pas détecté par
`property-view.spec.ts`, qui vérifie la présence du contenu mais pas son espacement visuel).

---

## 🔴 Corrigé — Bouton "Modifier" envoyait la quasi-totalité des annonces immobilières vers le mauvais flux d'édition

**Statut** : corrigé, vérifié. Bug le plus étendu trouvé cette session en termes de nombre
d'annonces affectées. Corrigé en deux temps (discriminant, puis destination — voir plus bas).

**Repro initial** : sur `/property`, cliquer "Modifier" sur une annonce immobilière → atterrit
sur `/category-listing/create/preview/{id}` (le flux d'édition **Mode**, brouillon de
catégorie), pas sur le flux d'édition immobilier attendu.

**Cause** : `AdManagementPage.tsx` décidait du lien "Modifier" avec `ad.categoryId` seul
(`ad.categoryId ? .../preview/${id} : .../modify/${id}`). Or un backfill en prod (2026-08-17,
commentaire déjà présent dans `resolveScope()` de `/api/announcer/ads/route.ts`) a posé
`categoryId` sur **~949 annonces sur 950, immobilier comprises** (studio, home, apartment...).
`categoryId` seul n'a donc jamais été un discriminant fiable — c'est exactement pourquoi
`resolveScope()`, `HouseDetails.tsx` et `PreviewPropertyClient.tsx` (corrigé plus haut) testent
tous `!typeProperty && categoryId`, jamais `categoryId` seul. Le bouton "Modifier" est le seul
endroit du code où ce piège, pourtant déjà documenté ailleurs dans le même fichier de route,
n'avait pas été appliqué.

**Correctif (discriminant)** : même test que partout ailleurs — `!ad.typeProperty && ad.categoryId`.

**Correctif (destination, décision produit du 2026-08-29)** : l'ancien formulaire immobilier à 14
builders (`/property/modify/[id]`, `FormModifyProperty.tsx`/`FormProperty.tsx`) n'est plus le
point d'entrée de "Modifier" pour l'immobilier — décision explicite du PO ("ce n'est plus le
formulaire super long"). L'immobilier bascule sur la même famille de page que Mode : preview +
crayons par attribut (`PreviewPropertyDraft.tsx`, route `/property/create/preview/{id}`), déjà
utilisée pour la relecture juste après création par l'IA. Cette page ne gérait que l'état
"vient d'être créée, en attente de review" (`moderationStatus: 'PENDING'`) ; comme elle sert
maintenant aussi à éditer une annonce déjà `APPROVED` (en ligne) ou `REJECTED`, son bandeau a été
rendu conditionnel sur `moderationStatus` (mirroir du pattern déjà en place dans
`PreviewCategoryListingDraft.tsx` pour Mode) :
- `PENDING` : bandeau vert "vient d'être enregistrée, en attente de review" (inchangé) ;
- `REJECTED` : bandeau rouge avec le motif de rejet, et toute sauvegarde repasse l'annonce en
  `PENDING` automatiquement (même règle gratuite que Mode) ;
- autre (`APPROVED` normalement) : bandeau neutre "Modifie ce que tu veux avec les crayons
  ci-dessous", sans prétendre que l'annonce vient d'être créée.

L'ancien formulaire `/property/modify/[id]` n'a pas été supprimé (personne ne l'a demandé), mais
n'est plus lié depuis "Modifier" — probablement mort/orphelin désormais, à vérifier avant de le
retirer.

**Fichiers** : `AdManagementPage.tsx` (lien), `PreviewPropertyDraft.tsx` (bandeau conditionnel +
reset REJECTED→PENDING au save), `property/create/preview/[id]/page.tsx` (commentaire mis à jour).

**Test qui le prouve** : `apps/location-maison/__tests__/e2e/property-edit.spec.ts` — une annonce
immobilière `APPROVED` avec `categoryId` réaliste (imite le backfill) vérifie l'atterrissage sur
`/property/create/preview/{id}`, l'absence du bandeau "vient d'être créée" et la présence du
bandeau neutre ; une annonce immobilière `REJECTED` vérifie l'affichage du motif de rejet ; une
annonce Mode vérifie l'atterrissage sur `/category-listing/create/preview/{id}`.

**Bug de test découvert en écrivant ce test** : `RUN_ID = Date.now()` en tête de fichier peut
produire la même valeur dans deux workers Playwright lancés à la même milliseconde
(`fullyParallel: true` fait tourner chacun des tests de ce fichier dans un worker séparé, chacun
recalculant `RUN_ID` indépendamment) — les deux écrivent alors le même id Firestore, et
l'`afterAll` du premier worker à finir supprime le document avant que l'autre worker n'ait fini
de tester dessus. `OWNER_UID` statique aggrave le symptôme : comme il est interrogé par égalité
stricte sans filtre par id, les annonces de tous les workers actifs en même temps s'affichent
ensemble sur la même page (annonces "Robe test..." vues en double/quadruple). Corrigé dans
`property-edit.spec.ts` avec `crypto.randomUUID()` pour `RUN_ID` et un `OWNER_UID` dérivé
(`e2e-property-edit-owner-${RUN_ID}`), garantissant une isolation complète par worker.
**Ce même pattern (`OWNER_UID` statique, parfois `RUN_ID = Date.now()`) existait tel quel dans
`property-view.spec.ts`, `property-promotion.spec.ts`, `property-delete.spec.ts` et
`property-filters-search.spec.ts`** — `property-view.spec.ts` a été vu échouer avec exactement
le même symptôme (carte introuvable) en exécution isolée pendant cette session. Corrigé plus tard
le même mois dans les 4 fichiers — voir la section "Nettoyage du reste de la dette..." plus bas.

**Contention serveur observée** : lancer les 8 "projects" Playwright (tous pointent vers le même
serveur dev réutilisé sur le port 3001 et le même Firestore — les suffixes `-dev`/`-preprod`/
`-prod` ne changent pas l'env à l'intérieur d'une même exécution) ou plusieurs fichiers de specs
en parallèle sature ce serveur unique et produit des échecs "élément introuvable" qui disparaissent
en isolant `--project=chromium-desktop-dev` sur un seul fichier à la fois — vu se reproduire sur
des tests déjà considérés stables (promotion, suppression, filtres). Pas un bug produit ; limite
de l'environnement de test local. **Autre piste identifiée pour cette même contention** :
`reuseExistingServer: true` ne réutilise que s'il trouve déjà un serveur qui répond sur le port
cible (3001 par défaut) — sinon Playwright démarre son propre `next dev --turbopack` pour la durée
de l'exécution puis le termine à la fin. Enchaîner des `npx playwright test` successifs relance
donc à chaque fois une compilation Turbopack à froid, et les premières requêtes tombent pendant
que le serveur compile encore — d'où des taux de réussite très variables d'une exécution à
l'autre. Pointer `E2E_BASE_URL` vers un serveur dev déjà chaud et durable (lancé une fois via
`npm run dev` dans un terminal séparé, laissé tourner) réduit un peu ce bruit mais ne l'élimine
pas complètement : avec plusieurs workers Playwright (`fullyParallel: true`), même un serveur
chaud reste sensible à la charge. **Seul `--workers=1` (tests de ce fichier sérialisés) a donné
un taux de réussite fiable de 5/5 de façon répétée** ; en parallèle (3 workers pour 5 tests), le
taux observé a varié de 5/5 à 0/5 selon l'exécution, sans lien avec le code testé — reproduit à
l'identique en pointant vers un serveur déjà chaud. À traiter comme limite de l'environnement de
test local, pas comme un signal sur la correction du code.

## 🔴 Corrigé — Les sauvegardes via les crayons (EditableField) ne persistaient jamais réellement

**Statut** : corrigé, vérifié avec une vraie relecture Firestore (pas seulement l'apparence de
l'UI). Trouvé en écrivant le test de sauvegarde de `property-edit.spec.ts` — sans ce test, rien
dans l'UI ne le laissait deviner.

**Symptôme** : sur `/property/create/preview/{id}`, éditer un champ via un crayon (titre, prix,
description...), cliquer "Enregistrer" → le crayon repasse en mode affichage avec la nouvelle
valeur, aucune erreur visible. Tout donne l'impression que la sauvegarde a réussi. En relisant le
document Firestore juste après (Admin SDK, pas le SDK client), l'ancienne valeur était toujours
là — rien n'avait été persisté.

**Cause** : `updateProperty()` (`src/db/property.db.ts`) passait par `updateModel()`
(`src/db/generic.db.ts`), qui utilise le SDK Firestore **client** (`updateDoc`). Or
`firestore.rules` exige `request.auth != null` pour écrire sur `properties/{id}`, et — fait déjà
établi cette session à trois reprises (création de compte téléphone, finalisation de profil,
suppression d'annonce) — **aucune session réelle ne laisse jamais le navigateur avec une vraie
session Firebase Auth côté client** : ni Google (credential échangé côté serveur), ni la connexion
email/mot de passe (Credentials provider de NextAuth, dont `authorize()` tourne aussi côté
serveur). `updateDoc` échouait donc systématiquement avec `FirebaseError: Missing or insufficient
permissions.` — mais silencieusement : `saveField()` catch bien l'échec et devrait normalement
afficher une erreur via `EditableField`, sauf que le test a montré que dans certains passages le
message d'erreur n'apparaissait pas de façon fiable non plus (à surveiller si ça se reproduit). Ce
chemin est le SEUL moyen de sauvegarde de `PreviewPropertyDraft.tsx` ET
`PreviewCategoryListingDraft.tsx` — la fonctionnalité crayon était donc probablement cassée pour
**toute** annonce (immobilier et Mode) depuis sa création, pas seulement pour le nouveau flux
"Modifier" immobilier ajouté aujourd'hui.

**Portée plus large** : `updateProperty()` est aussi appelé par `property.form.provider.tsx`
(l'ancien formulaire wizard), `ad-management.service.ts` (archiver/réactiver une annonce) et
`ListPropertySection.tsx` — ces trois chemins étaient donc probablement affectés aussi, pas
vérifiés individuellement ici mais corrigés par le même changement puisqu'ils passent tous par la
même fonction.

**Correctif** : même remède que `deleteProperty()` — route serveur Admin SDK. Nouveau handler
`PATCH` sur `/api/property/[id]/route.ts` (à côté du `DELETE` existant) : vérifie la session,
vérifie que `createdBy`/`claimedBy` correspond à l'utilisateur, filtre les champs protégés
(`createdBy`, `claimedBy`, `id`, `currentPromotion`), applique le patch via `propertyRef.update()`
(Admin SDK), invalide le cache SEO côté serveur. `updateProperty()` appelle maintenant cette route
via `fetch(..., { method: 'PATCH' })` au lieu de `updateModel`.

**Fichiers** : `src/app/api/property/[id]/route.ts` (nouveau handler `PATCH`),
`src/db/property.db.ts` (`updateProperty`), `__tests__/db/property.db.test.ts` (test unitaire
réécrit pour le nouveau chemin fetch).

**Test qui le prouve** : `property-edit.spec.ts` — deux tests éditent un champ via un crayon puis
relisent le document Firestore par Admin SDK (`getProperty()`, nouveau helper) pour confirmer une
vraie persistance, pas juste l'apparence côté UI : un sur une annonce `APPROVED` (le titre change
réellement et `moderationStatus` reste `APPROVED`), un sur une annonce `REJECTED` (le titre change
et `moderationStatus` repasse bien à `PENDING` avec `rejectionReason` remis à `null`).

*Créé le 2026-08-29, mis à jour le même jour suite au test complet des 4 types de promotion,
de la suppression d'annonce, du bouton "Voir" (immobilier + Mode) et du bouton "Modifier"
(discriminant puis destination finale).*

## 🟢 Couverture ajoutée — `property-archive.spec.ts` (archiver/désarchiver, immobilier + Mode)

**Statut** : pas de bug produit trouvé ici — cette suite confirme surtout que le correctif
`updateProperty` → route `PATCH` Admin SDK (voir la section ci-dessus sur les crayons) profite
aussi à `toggleAdState` (`ad-management.service.ts`), qui appelle la même fonction. Sans ce
correctif, archiver/désarchiver aurait souffert du même échec silencieux (`permission-denied`
côté SDK client) que les crayons EditableField.

**Piège rencontré en écrivant le test, corrigé le même jour** : le bouton "Archiver"/"Activer" de
la carte n'agit pas directement — il ouvre une `Dialog` de confirmation
(`requestToggleState`/`confirmToggleState`). Le bouton de confirmation de cette Dialog était
libellé différemment selon le sens : "Archiver" pour archiver (cohérent avec le bouton de la
carte), mais **"Réactiver"** pour désarchiver — alors que le bouton de la carte disait "Activer".
Uniformisé sur "Réactiver" partout (carte + Dialog + tests Jest/e2e concernés).

**Fichiers** : `__tests__/e2e/property-archive.spec.ts` (nouveau), `helpers/firebase-admin.ts`
(`SeedCategoryListing.state`, optionnel, pour seeder une annonce Mode déjà archivée),
`AdManagementPage.tsx` (libellé du bouton de la carte), `__tests__/components/ad-management-page.test.tsx`.

*Ajouté le 2026-08-30.*

## 🟢 Nettoyage du reste de la dette listée dans ce doc (2026-08-30)

Suite à la demande explicite de corriger tout ce qui restait ouvert dans ce fichier. Un point
(l'incohérence Activer/Réactiver ci-dessus) a été corrigé directement dans sa propre section ;
les autres sont regroupés ici.

**RUN_ID/OWNER_UID statiques, transverse** (signalé plus haut, section "Modifier") — corrigé
dans les 4 fichiers concernés :
- `property-view.spec.ts`, `property-filters-search.spec.ts`, `property-delete.spec.ts` : même
  traitement que `property-edit.spec.ts`/`property-archive.spec.ts` — `crypto.randomUUID()` pour
  `RUN_ID`, `OWNER_UID` et tous les ids d'annonces dérivés, isolation complète par worker. Au
  passage dans `property-delete.spec.ts` : la vérification finale ("le document n'existe plus")
  comparait à un id littéral `'e2e-prop-delete'` — devenu un vrai faux-négatif potentiel une fois
  l'id rendu dynamique, corrigé pour comparer à `PROPERTY.id`.
- `property-promotion.spec.ts` : cas différent — ses tests dépendent **volontairement** les uns
  des autres dans le même run (solde de crédits cumulatif, "promotion déjà active"). Une
  isolation par worker aurait cassé cette hypothèse. Corrigé avec
  `test.describe.configure({ mode: 'serial' })` à la place, qui force l'exécution en séquence
  dans un seul worker — plus le même traitement RUN_ID que les autres fichiers, par précaution
  contre une pollution par un run précédent.

**SimpleMap plante sans lat/lng** — `MapSection.tsx` vérifie maintenant
`Number.isFinite(latitude) && Number.isFinite(longitude)` avant de monter `SimpleMap`, et affiche
un repli propre ("Localisation non disponible sur la carte") sinon, au lieu de laisser
`L.marker([undefined, undefined])` planter toute la page ("Invalid LatLng object"). `Property.latitude`/`longitude`
restent typés `number` (non optionnels) mais certaines annonces existantes en base ne les ont pas.

**Audit du bug Timestamp (promotion) sur les autres routes** — vérifié `/api/property/promoted`
(accueil, sections À la une/Tendance), la page publique `/annonce/[id]` et son
`getPublicPropertyById`. Aucun des deux derniers ne lit `currentPromotion` côté client (pas de
badge/countdown affiché) : pas de bug actif là. `/api/property/promoted` en revanche renvoyait
lui aussi `currentPromotion` avec des `Timestamp` Admin SDK bruts (même défaut que
`/api/announcer/ads` avant son correctif) — latent, sans symptôme visible aujourd'hui puisque
`FeaturedSection.tsx`/`TrendingSection.tsx` n'affichent pas de badge de promotion, mais corrigé
par précaution pour ne pas laisser le même piège en place pour la prochaine fois que quelqu'un y
ajoutera un badge. La normalisation (`serializeTimestamp`/`serializePromotion`) a été extraite de
`/api/announcer/ads/route.ts` vers `src/lib/serialize-property-promotion.ts`, partagée par les
deux routes plutôt que dupliquée.

**Ancien formulaire `/property/modify/[id]` : vérifié, puis retiré** — la vérification a
contredit l'hypothèse initiale ("probablement orphelin") : deux liens vivants restaient présents
(`ListPropertySection.tsx` et l'email `PropertyPublished.tsx`), pas trois comme un survol rapide
l'aurait laissé penser. En creusant chacun :
- `ListPropertySection.tsx` (+ `PropertyList.tsx`, qui l'utilise) : composant **jamais monté** —
  aucun fichier de `src/app/` ne l'importe, ni directement ni via `PropertyList.tsx`. Mort en
  pratique malgré la présence du lien dans son code. Supprimés tous les deux, ainsi que
  `__tests__/components/list-property-section.test.tsx` qui ne testait qu'eux.
- `PropertyPublished.tsx` (template d'email "annonce publiée") : jamais réellement envoyé
  (`generatePropertyPublishedProps`/le composant ne sont invoqués nulle part dans
  `src/services/`/`src/app/api/`) — corrigé pour pointer vers la nouvelle destination
  (`/property/create/preview/{id}`) plutôt que supprimé, le template lui-même n'étant pas dans le
  périmètre de cette tâche.
- Confirmé aussi qu'un e2e **déjà existant** (`lot4-mobile-announcer.spec.ts`, test mocké)
  asserait encore l'ancienne destination `/property/modify/property-e2e-1` — cassé silencieusement
  depuis le changement de destination du bouton "Modifier" plus tôt cette session, jamais
  re-exécuté depuis. Corrigé pour attendre `/property/create/preview/property-e2e-1`.

Le formulaire lui-même (`FormModifyProperty.tsx`, `ModifyPropertyWithProvider.tsx`, la route
`/property/modify/[id]` entière) a été supprimé. **Non touché, délibérément** : `FormProperty.tsx`
et les builders par type (`FormVilla.tsx`, `FormStudio.tsx`, etc.) — toujours bien vivants,
utilisés par `/property/create` pour la **création** d'une annonce immobilière ; et les branches
`isUpdate` dans `property.form.provider.tsx` (fichier partagé, gros, utilisé aussi par la
création) — devenues mortes maintenant que plus rien n'appelle `PropertyFormComponentProvider`
avec `isUpdate=true`, mais les retirer proprement sans risquer de casser la création aurait
dépassé le périmètre de cette tâche. `route-guards.ts` (`isPropertyFormFlowPath`, désactive les
pubs pendant l'édition) a perdu son préfixe dédié `/property/modify/` — plus nécessaire, la
nouvelle destination `/property/create/preview/[id]` tombe déjà sous le préfixe `add_property_ai`
(`/property/create`) déjà couvert.

**Code mort "Boostée" retiré** — `duration: 0` par design pour le type `boost`
(`PROMOTION_CONFIGS`) fait que `endDate === startDate` : `hasActivePromotion()` (qui exige
`endDate > maintenant`) ne peut structurellement jamais être vrai pour ce type. Les branches
`case 'boost': return 'Boostée'` dans `PromotionButton.tsx` et `PromotionBadge.tsx` n'étaient
donc jamais atteintes — retirées (avec un commentaire expliquant pourquoi, pour éviter qu'un futur
lecteur ne les réintroduise en pensant combler un oubli). Le boost continue de fonctionner
normalement (remontée en tête de liste via `sortTimestamp`) ; seul l'affichage d'un badge/état
persistant reste absent, ce qui était déjà le comportement réel avant ce nettoyage.

**Découverte annexe, non corrigée (hors périmètre)** : en vérifiant `lot4-mobile-announcer.spec.ts`
(voir ci-dessus), plusieurs autres assertions de ce même fichier échouent aussi — violations de
strict mode Playwright sur des locators non désambiguïsés (`getByText`/`getByPlaceholder` sans
`.first()` ni scope par testid) là où la page rend délibérément deux blocs DOM, mobile et desktop
(`data-testid="ad-stats-mobile"`/`"ad-stats-desktop"`, `#property-search-mobile`/`#property-search`).
Une seule instance corrigée en passant ("Total annonces", même remède `.first()` déjà utilisé une
ligne plus bas dans le même test pour "Actives"). Le reste de ce fichier semble ne plus être
passé depuis un moment, indépendamment de tout changement fait cette session — mériterait un
passage dédié.

*Créé le 2026-08-30.*

---

## 🟢 Couverture ajoutée — `property-and-mode-creation.spec.ts` (publication réelle immobilier + Mode, vérifiée sur /property)

**Demande directe de l'utilisateur** : tester la publication d'une annonce immobilière ET d'une
annonce Mode via leurs vrais formulaires, puis vérifier que les deux apparaissent sur `/property`
("Gestion des annonces"), chacune sous le bon onglet (Immobilier / Mode). Aucun des deux
parcours de création n'avait de couverture e2e allant jusqu'à une vraie écriture Firestore avant
ce test — seul le seed direct via Admin SDK existait (`seedProperties`/`seedCategoryListing`).

**Immobilier** : formulaire manuel classique (`/property/add/studio`, 3 étapes),
délibérément **pas** le nouveau flux IA (`/property/create`) qui dépend de Gemini et de crédits —
le flux manuel est déterministe. **Mode** : à la différence de l'immobilier, **aucune
alternative manuelle n'existe** pour `/category-listing/create` — c'est intégralement un flux IA
(description + photos → Gemini choisit catégorie/titre/attributs), donc ce second scénario
dépend nécessairement de Gemini ; description volontairement explicite et sans ambiguïté
("Je vends une robe en wax taille M... à Libreville... 15 000 FCFA") pour fiabiliser la
détection de catégorie.

Les deux formulaires écrivent via `createProperty()` (SDK Firestore **client**, `addDoc`) —
exige une vraie session Firebase Auth (`firestore.rules: isAnnouncer()`), pas seulement le
cookie NextAuth forgé. Même recette que `property-add-reel.spec.ts` : `seedAnnouncerUser` +
`signInAsAnnouncer` + `mockCommonAppNoise(page, { mockFirebaseToken: false })`.

**🟡 Bug d'environnement rencontré, PAS un bug produit — diagnostiqué mais pas corrigé (dev
Redis rate-limited, hors périmètre de ce travail)** : le scénario Mode a échoué plusieurs fois
avec "Aucune catégorie n'accepte de nouvelles annonces pour le moment." alors que les catégories
Mode (`vetements`, `chaussures`, `accessoires`, `parfums-beaute`) existent bien et sont
`isActive: true` en base (confirmé plusieurs fois par requête Admin SDK directe, y compris juste
avant l'échec). Cause confirmée directement : le projet Upstash **dev** est temporairement
rate-limited (`UpstashError: Your database has been temporarily rate-limited`, reproduit en
interrogeant la clé de cache `categories:publishable-leaves-v2` directement) — vraisemblablement
par le volume cumulé de toute la vraie navigation e2e de cette session (beaucoup de pages
utilisant `getCacheStore()`). Un premier essai de vider cette clé de cache a été bloqué par le
classifieur d'auto-mode (action sur une infra partagée) puis autorisé explicitement ; le test est
repassé au vert juste après — mais le rate-limit Upstash est réapparu plus tard dans la session
et a refait échouer le même scénario à plusieurs reprises, de façon non déterministe selon l'état
du quota au moment du run.

**Lacune de résilience révélée en creusant (réelle, mais hors périmètre — pas corrigée)** :
`/api/categories/publishable-leaves` ne se dégrade pas proprement quand Redis est indisponible —
tout échec (rate-limit compris) semble se traduire par une réponse non-`ok` côté client, et
`fetchPublishableLeaves()` (`category-listing/create/page.tsx`) traite alors silencieusement
"erreur serveur" et "vraiment aucune catégorie active" de la même façon ("Aucune catégorie
n'accepte de nouvelles annonces pour le moment."), sans que l'utilisateur ni les logs ne
distinguent les deux cas. Une vraie panne Redis en production produirait exactement ce même
message trompeur à un annonceur essayant de publier une annonce Mode. Mériterait un correctif
séparé (repli sur une lecture Firestore directe si le cache échoue, comme le fait déjà
`/api/announcer/ads` qui n'utilise pas de cache du tout pour cette raison).

**Deux vrais champs pré-remplis à connaître pour ce parcours** :
- Le champ téléphone de l'étape 3 immobilier est **pré-rempli** depuis le profil de
  l'utilisateur de test (`phoneNumbers` seedé) — pas besoin de le re-remplir ; il existe en
  double dans le DOM (mise en page mobile + desktop en parallèle, comme ailleurs dans cette
  suite), d'où `.first()` sur l'assertion plutôt qu'un match strict.
- Le flux Mode lit le contact depuis `user.callNumber || user.phoneNumbers?.[0]` **sans aucun
  champ téléphone dans son UI** — contrairement au formulaire immobilier. Sans `phoneNumbers`
  seedé sur l'utilisateur de test, la génération est bloquée avant même l'appel IA ("Ajoute un
  numéro de téléphone à ton profil avant de publier."). `seedAnnouncerUser()` étendu avec un
  paramètre optionnel `{ phoneNumbers }` pour couvrir ce cas (rétrocompatible, tous les autres
  appels existants l'omettent).

**Nouveau helper** : `findPropertiesByOwner(uid)` (`firebase-admin.ts`) — `createProperty()`
génère l'id côté client (`addDoc`), et le formulaire immobilier ne le met même pas dans son URL
de succès (`/property?submitted=1`, sans id) ; impossible de retrouver l'annonce créée autrement
qu'en interrogeant par `createdBy`, même principe que `findReelByOwner` pour les réels.

**Découverte annexe, non corrigée (hors périmètre)** : la page `/category-listing/create/preview/{id}`
émet un avertissement Next.js répété ("Only plain objects can be passed to Client Components
from Server Components... Objects with toJSON methods are not supported") sur les champs
`createdAt`/`updatedAt`/`sortTimestamp` — un `Timestamp` Admin SDK passé tel quel comme prop à un
Client Component, jamais sérialisé en `{seconds, nanoseconds}` plat au préalable. Même famille de
piège que celui déjà rencontré et corrigé ailleurs cette session (`serializePropertyPromotion`),
mais ici la page fonctionne quand même (React résout apparemment `toJSON()` silencieusement) donc
non bloquant — juste un avertissement serveur, pas une erreur visible. Mériterait le même
correctif que les autres routes si cette page est retouchée.

**Fichiers** : `__tests__/e2e/property-and-mode-creation.spec.ts` (nouveau),
`__tests__/e2e/helpers/firebase-admin.ts` (`seedAnnouncerUser` étendu, `findPropertiesByOwner`
ajouté).

**Test qui le prouve** — trois étapes en série dans un seul fichier :
- **Publication immobilière** : remplit les 3 étapes du formulaire studio (images, titre,
  description, superficie, prix, propriétaire, tag, province/ville/quartier via
  `PlacesAutocompleteInput`), clique "Enregistrer", vérifie le toast de succès + la redirection,
  puis en base que le document existe réellement avec `typeProperty` renseigné (le discriminant
  "Immobilier" côté `resolveScope()`).
- **Publication Mode** : remplit description + photo, clique "Générer l'annonce", vérifie la
  redirection vers la page preview, puis en base que le document existe réellement **sans**
  `typeProperty` (le discriminant "Mode"/marketplace).
- **Vérification croisée sur /property** : l'annonce immobilière est visible sous l'onglet
  "Immobilier" (actif par défaut) et absente sous "Mode" ; l'annonce Mode est visible sous
  l'onglet "Mode" après un clic dessus, et absente sous "Immobilier" — preuve que chacune est
  bien classée dans le bon onglet, pas seulement qu'elle existe quelque part sur la page.

**Statut de vérification** : les 3 tests sont passés au vert intégralement, à deux reprises
chacun, en isolation par viewport (3/3 sur `chromium-mobile` seul, puis 3/3 sur
`chromium-desktop-dev` seul — deux runs propres et complets, preuve que le parcours fonctionne
réellement de bout en bout). Les tentatives suivantes de confirmation combinée (les deux
viewports dans la même commande) ont buté sur le rate-limit Upstash dev décrit ci-dessus, externe
au test — pas rejouées indéfiniment pour éviter d'aggraver ce rate-limit. Timeouts déjà élargis
en prévision de la contention réelle entre plusieurs projets Playwright sur ce parcours lourd
(upload Storage + écriture Firestore + appel Gemini) : `test.setTimeout(90_000)` sur les deux
tests de publication, image "1/10" jusqu'à 60s, toast de succès immobilier jusqu'à 40s. À
rejouer sur `location-maison-dev` une fois le quota Upstash reconstitué.

*Créé le 2026-09-01.*

---

## 🔴 Corrigé — Le sélecteur "Attacher à une annonce" excluait toutes les annonces Mode (régression introduite la veille)

**Contexte** : question directe de l'utilisateur — "comment sait-on qu'un réel est Mode, le
formulaire de création ne montre rien qui le permette ?". En creusant la réponse (la catégorie
d'un réel n'est jamais choisie directement, elle est copiée depuis l'annonce à laquelle il est
rattaché — `categoryPath`, voir `resolveScope()` dans `/api/announcer/ads/route.ts`), un vrai bug
est apparu : `searchOwnedProperties()` (`property.db.ts`, utilisée par
`SelectPropertyForReelClient.tsx` pour "Attacher à une annonce") appelait
`/api/announcer/ads?scope=immobilier` codé en dur — introduit la veille en construisant la
recherche+pagination de ce sélecteur (voir l'entrée précédente). Conséquence : **toutes les
annonces Mode disparaissaient du sélecteur**, alors que rien côté API ne limite un rattachement
de réel à l'immobilier (`attachReelToProperty` écrit sur `properties/{id}` sans distinguer le
type). La seule façon d'obtenir un réel Mode restait de créer le réel directement depuis la page
d'une annonce Mode (`propertyId` préselectionné dans l'URL) — le flux générique "Mes réels" →
"Attacher à une annonce" ne le permettait plus du tout.

**Correctif** : `/api/announcer/ads/route.ts` accepte désormais `scope=all` (en plus de
`immobilier`/`marketplace`) — mélange les deux familles sans filtre, uniquement pour cet usage
précis ("Gestion des annonces" continue de demander un scope précis pour ses onglets).
`searchOwnedProperties()` utilise ce nouveau `scope=all`.

**Reste ouvert (pas dans le périmètre de ce correctif)** : la question initiale de
l'utilisateur — le manque de visibilité de la catégorie dans le parcours de création/rattachement
d'un réel (ni sur l'écran de création, ni dans le sélecteur d'annonce, ni sur la carte du réel
une fois publié) — n'est pas résolue, seulement le bug d'exclusion qui l'accompagnait. À discuter
séparément si un affichage explicite de la catégorie est souhaité quelque part dans ce parcours.

**Fichiers** : `src/app/api/announcer/ads/route.ts` (`scope=all`),
`src/db/property.db.ts` (`searchOwnedProperties`).

**Test qui le prouve** :
- Jest (`__tests__/api/announcer-ads.test.ts`) : `scope=all` renvoie bien les annonces
  immobilier ET marketplace mélangées, sans filtre.
- Jest (`__tests__/db/property.db.test.ts`) : `searchOwnedProperties()` appelle bien
  `/api/announcer/ads?scope=all&...` (corrigé, testait auparavant `scope=immobilier`).
- E2E réel (`reel-attach-property.spec.ts`, nouveau test) : seed une annonce immobilier ET une
  annonce Mode pour le même annonceur, ouvre le sélecteur "Attacher à une annonce", vérifie que
  les deux titres sont bien visibles — aurait détecté la régression si elle avait existé avant
  ce correctif (le listing Mode n'apparaissait pas du tout auparavant).

*Créé le 2026-09-01.*

---

## 🟢 Preuve de bout en bout ajoutée — la catégorie d'un réel se propage bien au rattachement (Jest + e2e réel)

**Demande directe de l'utilisateur**, suite au correctif ci-dessus : "refait les tests alors on
va voir si la categorie passe bien" — vérifier concrètement que rattacher un réel à une annonce
Mode copie bien la bonne catégorie dessus, pas seulement que l'annonce Mode redevient visible
dans le sélecteur.

**Trois niveaux de preuve ajoutés** :
- Jest (`reels-api.test.ts`) : l'action `attach-property` copie bien `property.categoryPath`
  (`{ lvl0: 'Mode', lvl1: 'Mode > Vêtements' }`) sur le document `reels/{id}` — logique déjà
  présente dans la route, jusqu'ici non testée directement.
- E2E réel (`reel-attach-property.spec.ts`) : seed un réel orphelin + une annonce Mode, ouvre le
  sélecteur, l'attache, vérifie en base que `categoryPath.lvl0 === 'Mode'` — exactement le champ
  que `getPublicReels()` filtre pour l'onglet "Mode" du fil public (`reel.db.ts`).
- Aide de test corrigée en le faisant (`seedCategoryListing`, `firebase-admin.ts`) :
  `categoryPath` ne posait que `lvl1`, jamais `lvl0` — contrairement au vrai flux de création
  (`category-listing/create/page.tsx`, qui pose toujours les deux). Une annonce Mode seedée par
  ce helper aurait donc été invisible de n'importe quel filtre par catégorie racine, sans rapport
  avec le bug testé ici. `lvl0` désormais dérivé de `categoryLeaf` ("Mode > Vêtements" → "Mode").

**Détour, non gardé dans le test final** : une première version vérifiait aussi que le réel
apparaissait réellement dans l'onglet "Mode" du **vrai** fil public affiché (`/reels`, après
clic sur l'onglet) — la preuve la plus convaincante possible. Deux runs consécutifs (desktop
puis mobile, quelques secondes d'écart) ont révélé que `/api/reels/feed` met en cache sa réponse
par catégorie 10 minutes (`reels:feed:Mode:{limit}:first`, Redis) **sans segmenter par run de
test** — le second run a vu la carte laissée par le premier, pas la sienne, un faux négatif pur
sur un mécanisme qui fonctionne réellement (confirmé par le premier run, passé proprement).
Retiré cette assertion UI au profit du seul contrôle `categoryPath.lvl0` en base — c'est
exactement ce que ce filtre lit, donc une preuve tout aussi déterminante mais qui ne dépend pas
de l'état d'un cache partagé.

**Fichiers** : `__tests__/api/reels-api.test.ts`, `__tests__/e2e/reel-attach-property.spec.ts`,
`__tests__/e2e/helpers/firebase-admin.ts` (`seedCategoryListing`).

*Créé le 2026-09-01.*
