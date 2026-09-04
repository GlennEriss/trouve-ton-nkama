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

## 🟢 Correctif UX — rien n'indiquait, dans le parcours réel, si un réel serait classé Immobilier ou Mode

**Demande directe de l'utilisateur** : après avoir confirmé (entrée précédente) que la catégorie
se propage bien en base au rattachement, il a signalé que ça restait invisible à l'écran :
"Bon je suis entrain de créer un reel mais je ne vois pas toujours ce qui me permet de dire que
c'est un reel de mode ou immobilier". Un réel n'a jamais de catégorie choisie directement — il
hérite de `categoryPath` copié depuis l'annonce au rattachement (voir entrée précédente) — mais
rien dans l'UI ne montrait ce résultat avant de publier.

**Correctif** : nouveau helper partagé `src/lib/listing-scope.ts` (`resolveListingScopeLabel` /
`resolveReelScopeLabel`), même discriminant que `resolveScope()` côté serveur
(`typeProperty` présent = Immobilier, absent = Mode ; `categoryId` explicitement écarté car posé
sur la quasi-totalité des annonces par un backfill). Badge ajouté à trois endroits du parcours :
- `SelectPropertyForReelClient.tsx` (sélecteur d'annonce) : pastille "Immobilier"/"Mode" sur
  chaque carte.
- `CreateOrphanReelClient.tsx` (création avec annonce présélectionnée) : "Ce réel sera classé
  {Mode|Immobilier}" sur l'écran d'intro, et la même pastille sur le pill "Pour « {titre} »" de
  l'écran de recadrage vidéo.
- `MyReelsClient.tsx` (Mes réels) : pastille à côté du statut de rattachement sur chaque carte
  existante ; absente (pas de faux "Immobilier" par défaut) si `categoryPath` manque — cas d'une
  annonce immobilier trop ancienne pour l'avoir reçu au backfill.

**Vérification** : confirmé visuellement par capture d'écran (fichier de test jetable, seed
1 annonce immobilier + 1 Mode, supprimé après vérification) avant d'ajouter une preuve durable —
`reel-attach-property.spec.ts` (test "le sélecteur d'annonce propose aussi bien l'immobilier que
le Mode, avec un badge par annonce") scope désormais chaque carte via l'ancêtre `cursor-pointer`
et vérifie le texte exact du badge ("Immobilier" sur la carte immobilier, "Mode" sur la carte
Mode) — 5/5 sur `chromium-desktop-dev` et `chromium-mobile`. `tsc --noEmit` propre, suite Jest
complète 1513/1513 sans régression.

**Fichiers** : `src/lib/listing-scope.ts` (nouveau), `src/components/reels/SelectPropertyForReelClient.tsx`,
`src/components/reels/CreateOrphanReelClient.tsx`, `src/components/reels/MyReelsClient.tsx`,
`__tests__/e2e/reel-attach-property.spec.ts`.

*Créé le 2026-09-01.*

## 🟢 Correctif UX (suite) — l'entrée directe `/reels/add` (sans annonce présélectionnée) ne montrait toujours rien

Le correctif précédent ne couvrait que le cas où une annonce est déjà présélectionnée
(`?propertyId=...`). L'utilisateur a montré une capture de `/reels/add?returnTo=%2Freels%2Fmine`
— exactement les liens `CREATE_REEL_FROM_MINE_HREF` (`MyReelsClient.tsx`) et
`CREATE_REEL_FROM_FEED_HREF` (`ReelsFeedClient.tsx`), qui sautent entièrement le sélecteur
d'annonce et déposent l'annonceur directement sur l'écran d'upload sans aucune annonce liée. Sur
cet écran, il n'existe **aucun moyen de choisir** Immobilier/Mode à la création : ce choix est
entièrement différé au rattachement après coup (`/reels/select-property`), et le texte
précédent ("Vous pourrez l'attacher à une de vos annonces ensuite") ne le disait pas assez
clairement pour que l'utilisateur comprenne où faire ce choix.

**Correctif** : dans `CreateOrphanReelClient.tsx`, quand aucune annonce n'est présélectionnée,
affichage d'un badge explicite "Pas encore classé Immobilier ou Mode" + un bouton "Choisir une
annonce" pointant directement vers `/reels/select-property` (`routes.protected.reels_select_property`)
— répond directement à la question de l'utilisateur en donnant un chemin cliquable vers l'endroit
où ce choix se fait réellement, au lieu de le laisser deviner. Vérifié visuellement par capture
d'écran (fichier de test jetable, supprimé après vérification) : badge ambre + bouton vert
visibles sous le titre "Créer un réel".

**Fichiers** : `src/components/reels/CreateOrphanReelClient.tsx`.

*Créé le 2026-09-01.*

## 🔴 Correctif majeur — l'onglet "Immobilier" du fil public de réels était structurellement vide (bug latent, jamais lié à l'UI)

**Demande directe de l'utilisateur** : "que l'on choisisse une annonce ou pas ça ne coute rien de
faire un chips qui change de catégorie quand clique dessus directement sur la page [...] à côté
de contact" — un chip Immobilier/Mode cliquable directement sur l'écran d'upload, sans passer par
le sélecteur d'annonce.

**En implémentant ce chip, découverte d'un bug bien plus sérieux, sans rapport avec l'UI** :
`categoryPath` (le champ que `getPublicReels()` filtre pour les onglets du fil public,
`categoryPath.lvl0`, reel.db.ts) n'était écrit **qu'à un seul endroit dans tout le code** —
`category-listing/create/page.tsx`, le flux Mode. Une annonce immobilier (stepper manuel ou flux
IA) n'obtient **jamais** son propre `categoryPath`, contrairement à ce que suggérait le
commentaire précédent sur `resolveReelScopeLabel` ("annonce trop ancienne pour l'avoir reçu au
backfill" — c'était en réalité systématique, pas un cas limite). Conséquence concrète : à la
création d'un réel avec une annonce immobilier présélectionnée, et au rattachement a posteriori,
`property.categoryPath` valait toujours `undefined`, donc le réel n'obtenait jamais
`categoryPath.lvl0 = 'Immobilier'` — **l'onglet "Immobilier" du fil public ne pouvait recevoir
aucun réel, quel que soit leur nombre**, depuis la mise en place de ce filtre.

**Correctif** : nouveau helper `resolveCategoryPathForProperty()` (`src/lib/listing-scope.ts`),
même discriminant que `resolveScope()`/`resolveListingScopeLabel` — repli sur
`{ lvl0: 'Immobilier' }` quand `typeProperty` est présent mais `categoryPath` absent. Appliqué
aux deux endroits qui écrivaient `property.categoryPath` sans repli (`POST /api/reels` à la
création, `PATCH .../attach-property` au rattachement, `src/app/api/reels/route.ts`).

**Chip demandé, ajouté en parallèle** : sur l'écran d'upload (`CreateOrphanReelClient.tsx`),
quand aucune annonce n'est présélectionnée, deux boutons "Immobilier"/"Mode" à côté du contact
(masqués dès qu'une annonce est présélectionnée — sa catégorie prévaut alors). Le choix est
transmis à `createReel()` (`src/db/reel.db.ts`, nouveau paramètre `categoryRoot`) puis à
`POST /api/reels` (nouveau champ `categoryRoot`, strictement validé à `'Immobilier' | 'Mode'` —
`INVALID_CATEGORY_ROOT` sinon — pour ne pas laisser un client injecter un `categoryPath.lvl0`
arbitraire dans le fil public), qui l'écrit directement sur le réel s'il n'a pas d'annonce.

**Vérification** :
- Jest (`__tests__/api/reels-api.test.ts`, 6 nouveaux cas) : chip appliqué sans annonce, chip
  ignoré quand une annonce est présélectionnée, `categoryRoot` invalide rejeté en 400, repli
  Immobilier à la création ET au rattachement quand l'annonce n'a pas son propre `categoryPath`.
- Jest composant (`__tests__/components/create-orphan-reel.test.tsx`, 3 nouveaux cas) : chip
  transmis à `createReel`, désélection en recliquant, chip masqué quand une annonce est
  présélectionnée — 3 assertions existantes mises à jour pour le nouveau paramètre.
- E2E réel (nouveau fichier `reel-create-category-chip.spec.ts`) : vraie publication sans
  aucune annonce, chip "Immobilier" cliqué, vérifie en base (Admin SDK) que le réel créé porte
  bien `propertyId` absent + `categoryPath: { lvl0: 'Immobilier' }` — 1/1 sur
  `chromium-desktop-dev` et `chromium-mobile`.
- Vérifié visuellement par capture d'écran (fichier de test jetable, supprimé après
  vérification) : les deux chips s'affichent bien sous le bouton Contact, celui sélectionné en
  surbrillance.
- Régression : `tsc --noEmit` propre, suite Jest complète 1521/1521, et
  `reel-attach-property.spec.ts` + `lot8d-reels-ux.spec.ts` + `property-add-reel.spec.ts` +
  `reel-create-category-chip.spec.ts` rejoués sur les deux viewports (un seul échec, déjà connu
  comme un flake de contention entre workers en exécution combinée — confirmé en le rejouant
  seul, qui passe systématiquement).

**Fichiers** : `src/lib/listing-scope.ts`, `src/app/api/reels/route.ts`, `src/db/reel.db.ts`,
`src/components/reels/CreateOrphanReelClient.tsx`, `__tests__/api/reels-api.test.ts`,
`__tests__/components/create-orphan-reel.test.tsx`, `__tests__/e2e/reel-create-category-chip.spec.ts`
(nouveau).

*Créé le 2026-09-01.*

## 🔴 Corrigé (prod) — /search affichait les annonces les plus anciennes en premier

**Demande directe de l'utilisateur** : "il affiche carrément les annonces les plus anciennes en
premier au lieu des plus récentes" sur https://tonnkama.com/search (constaté sur
localhost:3000/search, même index Algolia partagé entre dev et prod).

**Root cause** : `/search` est piloté par Algolia (`location-maison_property-index`), avec
`customRanking: ["desc(currentPromotion.endDate)", "desc(sortTimestamp)"]` — les annonces
promues passent avant tout le reste, `sortTimestamp` (récence) ne départage qu'entre annonces de
même statut de promotion. La fonction planifiée `expireStalePromotions`
(`functions/src/promotions/expire-promotions.ts`) désactive bien les promotions expirées
(`isPromoted: false`, `currentPromotion.isActive: false`) mais ne touchait JAMAIS
`currentPromotion.endDate` — or ce champ est exactement ce que lit `desc(currentPromotion.endDate)`,
qui ne regarde jamais `isActive`. Résultat : une annonce promue même une seule fois, il y a plus
d'un an, restait classée en tête de /search pour toujours, devant toute annonce plus récente
jamais promue. Confirmé en interrogeant directement l'index Algolia de prod : sur les 100
premiers résultats, 58 étaient d'anciennes promotions expirées (certaines remontant à avril
2025) et les annonces réellement récentes (août 2026) ne commençaient qu'en position 58.

**Correctif structurel** : nouvelle fonction `buildExpiryUpdate()`
(`functions/src/promotions/expire-promotions.policy.ts`), utilisée par la fonction planifiée —
supprime maintenant aussi `currentPromotion.endDate` (`FieldValue.delete()`) en plus de désactiver
`isActive`/`isPromoted`. Algolia traite un attribut de `customRanking` absent comme la valeur la
plus basse possible : une promotion expirée ne peut donc plus jamais battre quoi que ce soit sur
ce critère, y compris longtemps après son expiration. Volontairement restreint aux types
featured/trending (le type `boost` n'a pas de fenêtre "active" à expirer par conception, hors
périmètre de cette correction).

**Nettoyage des données déjà corrompues** : le correctif ci-dessus n'empêche que les FUTURES
expirations de laisser un `endDate` périmé — nouveau script one-shot
`apps/location-maison-admin/scripts/promotions/backfill-clear-expired-promotion-enddate.ts`
(dry-run par défaut, `--apply` pour écrire, idempotent, même convention que
`backfill-sort-timestamp.ts`) pour nettoyer les documents déjà dans cet état. Dry-run confirmé
58 annonces en prod et 3 en dev — exactement le nombre trouvé en interrogeant l'index Algolia
directement. **Appliqué en prod ET dev après autorisation explicite de l'utilisateur** (une
tentative de dry-run direct sur prod avait été bloquée par le classifieur auto-mode comme action
sur infrastructure partagée — arrêté et demandé via `AskUserQuestion`, comme pour l'incident
Redis plus haut dans ce document). Reconfirmé après coup en réinterrogeant l'index Algolia en
direct : les 15 premiers résultats sont désormais bien les annonces les plus récentes (25, 21,
20... août 2026), triées par ordre décroissant correct.

**Vérification** :
- Jest (`functions/__tests__/promotions/expire-promotions.policy.test.ts`, nouveau cas) : `buildExpiryUpdate()`
  désactive `isPromoted`/`isActive` ET pose un sentinel `FieldValue.delete()` sur `endDate`.
- `tsc --noEmit` propre sur `functions/` et sur `location-maison-admin/` (nouveau script).
- Suite Jest complète de `functions/` : 113/113 sans régression.
- Preuve en direct sur l'index Algolia de prod, avant/après le backfill (requêtes brutes,
  documentées ci-dessus) — pas seulement l'apparence du correctif de code.

**Fichiers** : `functions/src/promotions/expire-promotions.policy.ts`,
`functions/src/promotions/expire-promotions.ts`,
`functions/__tests__/promotions/expire-promotions.policy.test.ts`,
`apps/location-maison-admin/scripts/promotions/backfill-clear-expired-promotion-enddate.ts`
(nouveau).

**Reste à déployer** : le correctif de `expire-promotions.ts` ne prend effet en prod qu'après un
déploiement Cloud Functions (`firebase deploy --only functions`) — action distincte, pas
effectuée dans le cadre de cette session (jamais demandée, et un déploiement Cloud Functions est
une action à part, hors du geste "corriger le code + les données déjà écrites").

*Créé le 2026-09-01.*

## 🟢 Correctif UX — les filtres de /search n'étaient adaptés qu'à l'immobilier, Mode en était absent

**Demande directe de l'utilisateur**, avant de commencer les tests e2e des filtres de
`/search` : "les filtres là ne sont adaptés qu'à l'immobilier et donc omet la partie Mode".

**Root cause** : `Statut` (FOR_RENT/FOR_SALE), `Surface (m²)` et `Types d'annonces`
(typeProperty) s'affichaient inconditionnellement dans les deux panneaux de filtre
(`FilterSearchDesktopPageSection.tsx` desktop, `FilterModalHomePage.tsx` mobile) — trois champs
qui n'existent tout simplement pas sur une annonce Mode. Pire, "Secteur recherché"
(Province/Ville/Quartier) est structurellement cassé pour Mode : `category-listing/create/page.tsx`
pose toujours `street: ''` (vide) et `province: GABON_PROVINCES[0].name` (codé en dur, jamais
la vraie localisation du vendeur) — seul `city` (texte libre extrait par l'IA depuis la
description) porte un vrai signal. Le sélecteur "Mode/Immobilier" (`CategoryFilterPills`)
existait déjà et fonctionnait, mais ne faisait qu'AJOUTER les filtres d'attributs Mode
(taille/marque/genre...) par-dessus le panneau immobilier existant, sans jamais le masquer.

**Correctif** (portée volontairement limitée aux filtres de recherche, décision explicite de
l'utilisateur — la correction de la capture de localisation à la création d'une annonce Mode
reste un chantier séparé, non traité ici) :
- `useIsImmobilierSearchScope()` (nouveau, `src/hooks/useSearchCategoryScope.ts`) : lit le
  paramètre `category` de l'URL, `true` pour "Toutes catégories"/"Immobilier", `false` sinon.
- Les deux panneaux masquent désormais Statut/Surface/Types d'annonces hors scope immobilier,
  et réduisent "Secteur recherché" à "Ville" seule (`SelectCityModeScope.tsx`, nouveau) —
  Province/Quartier disparaissent, puisqu'aucune donnée fiable ne les alimente pour Mode.
- `SelectCityModeScope` interroge la facette `city` SANS filtre province
  (`useAlgoliaAllCityOptions`, nouveau dans `useAlgoliaLocationOptions.ts`) : la cascade
  habituelle Province → Ville (`useAlgoliaCityOptions`, `enabled: !!province`) bloquerait
  sinon le sélecteur en attente d'une Province qui ne reflète jamais la vraie localisation.
- **Bug additionnel trouvé et corrigé en marge** : `CategoryFilterPills.selectCategory()`
  changeait la racine (`category`) sans jamais purger `categoryId`/`attr_<key>` (feuille et
  attributs Mode) ni les champs immobilier-only (`province`/`street`/`status`/`minArea`/
  `maxArea`/`typeProperty`) déjà présents dans l'URL. Sans ce nettoyage, un filtre laissé actif
  en changeant de racine continuait de s'appliquer à la recherche alors que son contrôle avait
  disparu de l'UI — résultats vides sans aucune explication visible. Purge désormais
  systématique de ces clés à chaque changement de racine, dans les deux sens.

**Vérification** :
- Jest (`__tests__/hooks/use-search-category-scope.test.ts`, nouveau) : les 3 cas de
  `useIsImmobilierSearchScope()`.
- Jest (`__tests__/components/category-filter-pills.test.tsx`, nouveau) : purge de
  `categoryId`/`attr_*`/immobilier-only en changeant de racine, champs génériques (`city`,
  `query`) préservés.
- Jest (`search-filter-desktop-section.test.tsx`, `home-page-filter-modal.test.tsx`, cas
  ajoutés) : sections immobilier-only absentes + `SelectCityModeScope` visible hors scope
  immobilier.
- Vérifié visuellement par capture d'écran (fichier de test jetable, supprimé après
  vérification) : bascule réelle sur `/search?category=Mode`, panneau réduit à Ville/Prix/Tags,
  25 annonces Mode (Parfums & beauté, Vêtements) affichées correctement.
- **Détour** : lors de cette vérification, les pastilles de catégorie ("Toutes catégories" /
  "Immobilier" / "Mode") sont apparues absentes du premier rendu malgré `/api/categories/active`
  répondant correctement — diagnostiqué comme un état HMR/Turbopack périmé du serveur `next dev`
  local, actif en continu depuis plusieurs jours de session (pas un bug de code) : confirmé en
  ajoutant un log temporaire dans `CategoryFilterPills.tsx`, qui a forcé une recompilation et
  fait immédiatement réapparaître les pastilles ; retiré ensuite.
- `tsc --noEmit` propre, suite Jest complète 1529/1529.

**Fichiers** : `src/hooks/useSearchCategoryScope.ts` (nouveau),
`src/components/search/SelectCityModeScope.tsx` (nouveau),
`src/hooks/useAlgoliaLocationOptions.ts`, `src/components/search/CategoryFilterPills.tsx`,
`src/components/search/FilterSearchDesktopPageSection.tsx`,
`src/components/home-page/FilterModalHomePage.tsx`,
`__tests__/hooks/use-search-category-scope.test.ts` (nouveau),
`__tests__/components/category-filter-pills.test.tsx` (nouveau),
`__tests__/components/search-filter-desktop-section.test.tsx`,
`__tests__/components/home-page-filter-modal.test.tsx`.

*Créé le 2026-09-01.*

## 🔴 Corrigé — l'état des filtres de /search survivait incorrectement à un changement de catégorie

**Demande directe de l'utilisateur**, avec une URL reproduisant le problème :
`/search?province=Estuaire&city=Libreville&street=Angondjé&maxPrice=10000&category=Mode` — puis,
en précisant le comportement voulu : *"le souci est quand je mets des filtres sur la section
'Toutes les catégories' puis je pars sur 'Mode' [...] mieux on réinitialise les filtres si on
change de section [...] pareillement si je pars de Immobilier à Mode ou de Mode à une autre"*.

**Root cause, deux couches** :
1. `CategoryFilterPills.selectCategory()` (juste après l'entrée précédente) ne purgeait que les
   champs immobilier-only (`province`/`street`/`status`/`minArea`/`maxArea`/`typeProperty`) —
   pas les filtres génériques (Prix, Ville, Tags). Un Prix ou une Ville posés sur "Toutes
   catégories" restaient donc actifs, invisibles, après bascule vers une autre section.
2. Plus grave : `buildPublicSearchFilters()` (`search-filter-query.ts`, la fonction qui construit
   réellement la requête Algolia) lisait les paramètres d'URL **sans jamais tenir compte de
   `category`**. Une URL combinant `category=Mode` avec un `province`/`street` déjà présent
   (navigation directe, lien partagé, historique du navigateur — pas seulement le clic sur une
   pastille) appliquait donc un filtre `street:"Angondjé"` qu'AUCUNE annonce Mode ne peut jamais
   satisfaire (`street` toujours vide à la création, voir l'entrée précédente) : zéro résultat,
   sans la moindre explication visible puisque les contrôles Province/Quartier sont cachés dès
   que `category` ≠ Immobilier. Reproduit et confirmé avec l'URL exacte fournie par
   l'utilisateur : 0 résultat avant correctif, 12 après.

**Correctif, aux deux couches** :
- `buildPublicSearchFilters()` ignore désormais entièrement les filtres immobilier-only
  (`province`/`street`/`status`/`typeProperty`/`minArea`/`maxArea`/`minNbrRooms`/`maxNbrRooms`,
  liste exportée `IMMOBILIER_ONLY_PARAMS`) dès que `category` n'est ni vide ni "Immobilier" —
  quelle que soit la façon dont l'utilisateur est arrivé sur cette URL. Défense en profondeur :
  corrige le bug même pour une URL qui contourne entièrement l'UI de la pastille.
- `CategoryFilterPills.selectCategory()` réécrit pour une **réinitialisation complète** au
  changement de section, pas une purge sélective : seule la recherche texte libre (`query`)
  traverse le changement, tout le reste (province/ville/quartier/prix/surface/statut/type/tags,
  la feuille Mode `categoryId`, ses filtres d'attributs `attr_<key>`) repart à zéro — exactement
  le comportement demandé, dans les deux sens (Immobilier→Mode, Mode→Immobilier, →"Toutes
  catégories", etc.).

**Vérification** :
- Jest (`__tests__/lib/search-filter-query.test.ts`, 2 nouveaux cas) : tous les champs
  immobilier-only ignorés quand `category=Mode` (avec `city`/`price`/`categoryPath.lvl0`
  toujours appliqués), tous appliqués quand `category` est vide ou "Immobilier".
- Jest (`__tests__/components/category-filter-pills.test.tsx`, réécrit) : un jeu complet de
  filtres (immobilier-only + génériques + Mode) posé sur une section est entièrement absent de
  l'URL après clic sur une autre pastille — seule `category`/`query` survit.
- E2E réel (fichiers de test jetables, supprimés après vérification) : l'URL exacte fournie par
  l'utilisateur passe de 0 à 12 résultats Mode ; un clic sur la pastille "Mode" depuis
  `/search?minPrice=1000&maxPrice=9000&city=Libreville` aboutit bien à `/search?category=Mode`
  seul, tous les filtres précédents effacés.
- `tsc --noEmit` propre, suite Jest complète 1531/1531.
- Régression réelle : `property-filters-search.spec.ts` + `lot8e-search-consultation.spec.ts`
  rejoués sur les deux viewports — un seul échec (`rend une page introuvable...`), confirmé
  **pré-existant et sans rapport** (page 404 d'une annonce individuelle, aucun fichier touché
  par ce correctif ne s'en approche — vérifié via `git diff`).
- **Incident en cours de diagnostic, corrigé immédiatement** : un `git stash` a été lancé par
  erreur pour isoler cet échec pré-existant, ce qui a temporairement remis le répertoire de
  travail dans son état d'avant les modifications de cette session. Repéré immédiatement via les
  avertissements automatiques de fichiers modifiés, corrigé par `git stash pop` avant toute autre
  action — aucune perte, mais un geste à ne pas répéter sur ce dépôt sans autorisation explicite.

**Fichiers** : `src/lib/search/search-filter-query.ts`,
`src/components/search/CategoryFilterPills.tsx`,
`__tests__/lib/search-filter-query.test.ts`, `__tests__/components/category-filter-pills.test.tsx`.

*Créé le 2026-09-02.*

## 🔴 Corrigé — l'upload de visuel publicitaire échouait toujours réellement (bug bloquant trouvé juste avant la promotion publique du module)

**Demande directe de l'utilisateur** : tests e2e réels du module Publicité (`/advertising`)
avant d'en faire la promotion sur ses réseaux pour attirer des annonceurs pub.

**Contexte technique découvert en amont** : contrairement aux réels/annonces (SDK client
Firebase, session Firebase réelle requise via `/api/generate-token`), le module Publicité
authentifie uniquement via la session NextAuth (`auth()`) — l'upload (`POST
/api/advertising/upload`) ET la création de campagne (`POST /api/advertising/campaigns`)
passent tous les deux par l'Admin SDK côté serveur. Le cookie NextAuth forgé de
`signInAsAnnouncer()` suffit donc seul pour un test e2e réel, sans le pont Firebase habituel.

**Bug trouvé en écrivant le premier test e2e réel (non mocké) de ce parcours** :
`src/app/api/advertising/upload/route.ts` appelait `getStorage(adminApp).bucket()` **sans nom
de bucket explicite**. L'app Admin (`src/firebase/admin.ts`) n'a pas de `storageBucket` dans sa
config — sans argument, le SDK devine l'ancienne convention `{project-id}.appspot.com`, qui ne
correspond pas au vrai bucket de ce projet (`*.firebasestorage.app`). Résultat en pratique :
**tout upload de visuel publicitaire échouait à 100%**, avec l'erreur "Bucket name not specified
or invalid" — bloquant entièrement la création de campagne (l'étape 2 du wizard, "Ajouter les
visuels", ne peut jamais passer à "5/5 emplacements prêts"). Même contournement déjà en place
ailleurs (`/api/reels/route.ts`, `/api/reels/[reelId]/video/route.ts`) mais oublié ici — la
suite Jest existante (`advertising-upload.test.ts`) ne pouvait pas le détecter : son mock de
`bucket` accepte n'importe quel nombre d'arguments sans distinguer les deux cas.

**Correctif** : même résolution `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || FIREBASE_STORAGE_BUCKET`
que les routes reels, appliquée à `/api/advertising/upload/route.ts`.

**Vérification** :
- E2E réel (nouveau fichier `advertising-real.spec.ts`) : parcours complet du wizard avec un
  vrai upload d'image (Storage réel), vrai `POST /api/advertising/campaigns`, vraie campagne
  `ad_campaigns` en base (`status: 'active'`, `billing.creditsUsed: 70`, placements corrects),
  vrai débit du compte (`users/{uid}.credits`, 100 → 30), et apparition réelle sur le dashboard
  après redirection — 2/2 sur `chromium-desktop-dev` et `chromium-mobile`. Second test : compte
  à 50 crédits (forfait à 70) → vrai 402, aucune campagne créée, crédits inchangés.
- Jest (`__tests__/api/advertising-upload.test.ts`, nouveau cas) : verrouille explicitement que
  `bucket()` est appelé avec le nom résolu depuis l'env, jamais sans argument — pour que ce
  bug précis ne puisse plus repasser inaperçu par cette suite.
- Nouveaux helpers de test (`__tests__/e2e/helpers/firebase-admin.ts`) : `getAdCampaign`,
  `findAdCampaignByOwner`, `deleteAdCampaigns` (nettoie aussi le fichier Storage et les
  `credit_transactions` associées), `getUserCredits`.
- Régression : suite Jest complète 1532/1532, `lot4-mobile-advertising.spec.ts` (existant,
  mocké) toujours 3/3, `tsc --noEmit` propre.

**⚠️ Signalé à l'utilisateur, non traité ici (décision produit, pas un bug de code)** : la doc
`docs/location-maison/feature/publicite/README.md` spécifie un V1 "concierge" (l'admin crée les
campagnes manuellement, le client paie l'admin directement, `billing.mode: 'admin_amount'`,
self-serve explicitement repoussé en "Phase 2"). Le code réellement en place est déjà la
Phase 2 self-serve : n'importe quel utilisateur connecté peut payer en crédits et publier une
campagne **instantanément active, sans aucune étape de modération**. Avant une promotion
publique invitant des inconnus à publier du contenu payant, vaut la peine de confirmer que
l'absence de modération est un choix assumé plutôt qu'un chantier resté inachevé.

**Fichiers** : `src/app/api/advertising/upload/route.ts`,
`__tests__/api/advertising-upload.test.ts`, `__tests__/e2e/advertising-real.spec.ts` (nouveau),
`__tests__/e2e/helpers/firebase-admin.ts`.

*Créé le 2026-09-02.*

## 🔴 Corrigé — AdSense poussait deux fois la même publicité sur (quasi) chaque chargement de page

**Demande directe de l'utilisateur** : "j'ai l'impression qu'on a fait un composant qui charge
une seule fois et je trouve les revenus générés trop bas" — révision de l'intégration Google
AdSense (`src/components/ads/AdSenseBlock.tsx`), déjà repérée en filigrane plus tôt dans cette
session via un warning console répété : `"AdSense push failed"` /
`"adsbygoogle.push() error: All 'ins' elements ... already have ads in them"`.

**La théorie "le composant ne charge qu'une fois" (jamais remonté à la navigation) était
fausse** — `<ins key={slotKey}>` force déjà un vrai remontage React à chaque changement de
slot, et 5 des 6 emplacements vivent dans des pages qui démontent entièrement à la navigation
App Router. Seul le pied de page persiste à travers les navigations, et il gère déjà ça
correctement (`slotKey = \`footer-${pathname}\``).

**Root cause réelle, à l'opposé** : le composant pousse la pub UNE fois... puis **une seconde
fois** peu après, sur le même nœud DOM, à cause de deux bugs combinés :
1. La garde anti-doublon comparait `data-ad-status` à `'done'` — une valeur que Google **ne
   pose jamais** (seulement `'filled'` ou `'unfilled'`, déjà utilisées ailleurs dans ce même
   projet, `globals.css:261,266`). Cette garde ne bloquait donc jamais rien.
2. Le tableau de dépendances de l'effet incluait `uid`/`isAuthenticated` (dérivés de
   `useSession()`, qui résout de façon asynchrone `'loading'` → `'authenticated'` peu après le
   montage) et `onStatusChange`. Quand la session résout, l'effet se relance — sur le **même**
   `<ins>` (slotKey/pathname inchangés, React ne le démonte pas) — et appelle
   `adsbygoogle.push({})` une seconde fois, sans que la garde cassée (point 1) ne l'arrête.

Concrètement : chaque chargement de page envoyait deux requêtes de publicité pour le même
emplacement, quelques centaines de ms d'écart — pas juste du bruit console. Une requête
dupliquée sur un slot déjà revendiqué par la file `adsbygoogle` peut faire échouer ou
invalider le remplissage réel, et des motifs de double-requête répétés sur un même compte sont
exactement le genre de signal que Google peut classer comme trafic non valide, avec un risque
réel de baisse de remplissage/CPC voire de sanction du compte — cohérent avec des revenus jugés
trop bas.

**Correctif** :
- Garde corrigée : vérifie `'filled'` ou `'unfilled'` (les seules valeurs réellement posées par
  Google), plus jamais `'done'`.
- `uid`/`isAuthenticated`/`onStatusChange` retirés du tableau de dépendances de l'effet
  principal — lus via une ref (`actorRef`, mise à jour par un effet séparé, sans effet de
  bord DOM) au moment de chaque appel `emitAdsSlotEvent`/`onStatusChange`, donc toujours à
  jour sans jamais relancer le `push({})`. L'effet ne se relance plus que sur
  `[slot, slotKey, pathname]` — les seules valeurs qui affectent réellement le nœud `<ins>`
  ciblé.

**Vérification** :
- Jest (`__tests__/components/adsense-block.test.tsx`, nouveau) : `push` appelé une seule fois
  malgré une résolution de session après montage (le bug exact) ; `push` non ré-appelé sur un
  nœud déjà `filled` même si l'effet se relance (ex. changement de pathname sans changement de
  slotKey) ; `push` ré-appelé pour un nouveau `slotKey` (nouveau `<ins>`, comportement normal
  préservé). Les deux premiers tests échouent de façon vérifiée avec l'ancien code (tracé
  manuellement : garde `'done'` + deps incluant uid/isAuthenticated → 2 appels).
- E2E réel (fichier de test jetable, supprimé après vérification) : chargement réel de
  `/search`, 0 warning "AdSense push failed" observé — le même chargement produisait ce warning
  de façon répétée plus tôt dans cette session (logs déjà capturés).
- `tsc --noEmit` propre, suite Jest complète 1535/1535 sans régression.

**⚠️ Signalé à l'utilisateur, non corrigeable en code** : `NEXT_PUBLIC_ADSENSE_SLOT_REELS_INLINE`
n'est défini dans aucun `.env.local*` — l'emplacement pub dans le fil des réels
(`src/lib/ads/config.ts:17`) retombe silencieusement sur le slot du pied de page (responsive,
petit format), potentiellement mal adapté à un emplacement plein écran/portrait. Nécessite de
créer un vrai bloc d'annonces dédié dans le tableau de bord AdSense pour avoir un vrai slot ID à
renseigner — action côté compte Google, pas quelque chose que je peux fabriquer.

**Fichiers** : `src/components/ads/AdSenseBlock.tsx`,
`__tests__/components/adsense-block.test.tsx` (nouveau).

*Créé le 2026-09-02.*

## 🔴 Corrigé — /advertising accessible (et cassé) sans être connecté

**Demande directe de l'utilisateur**, avec capture d'écran à l'appui : sur
`http://localhost:3000/advertising`, "0 crédits" et "Impossible de charger vos publicités.
Actualisez la page ou reconnectez-vous." — repéré en tournant une vidéo marketing sur cette
page. Intuition juste : "j'ai l'impression que cette page est accessible sans utilisateur
connecté".

**Root cause** : `/advertising` vit dans `app/(protected)/advertising/` (nom de dossier), mais
n'a jamais été ajouté à `PROTECTED_ROUTE_PREFIXES` dans `src/middleware.ts` — déjà repéré en
creux lors de l'investigation du module Publicité, non corrigé sur le coup faute de demande
explicite. Résultat : un visiteur non connecté charge quand même la coquille de la page
(`useCurrentUser()` sans session → `credits = 0` ; `GET /api/advertising/campaigns` → 401 →
React Query bascule en état d'erreur) au lieu d'être redirigé vers `/signin`, comme le sont déjà
`/property`, `/reels`, `/profil`, etc.

**Correctif** : `/advertising` ajouté à `PROTECTED_ROUTE_PREFIXES` — un visiteur non connecté
est désormais redirigé vers `/signin?callbackUrl=/advertising` (ou `/advertising/create`),
exactement comme les autres routes protégées. Volontairement **pas** ajouté à
`ANNOUNCER_ONLY_ROUTE_PREFIXES` : `POST /api/advertising/campaigns` n'exige que `auth()`,
n'importe quel compte connecté (pas seulement Annonceur) peut acheter une publicité.

**Vérification** :
- Jest (`__tests__/unit/middleware.test.ts`, 3 nouveaux cas) : visiteur non connecté sur
  `/advertising` → redirigé vers `/signin` avec le bon `callbackUrl` ; même chose sur
  `/advertising/create` (sous-route) ; un compte connecté SANS rôle Annonceur accède bien sans
  redirection (pas de garde-fou de rôle, contrairement à `/property`/`/reels`).
- Vérifié en direct sur le vrai serveur dev : `curl /advertising` → `307` vers
  `/signin?callbackUrl=%2Fadvertising` (et pareil pour `/advertising/create`).
- Régression : `advertising-real.spec.ts` + `lot4-mobile-advertising.spec.ts` (accès connecté)
  toujours 5/5 — la redirection ne casse rien pour un utilisateur réellement connecté.
- `tsc --noEmit` propre, suite Jest complète 1539/1539.

**Fichiers** : `src/middleware.ts`, `__tests__/unit/middleware.test.ts`.

*Créé le 2026-09-03.*

## 🟢 Fonctionnalité ajoutée — pill "Demandes" sur /search, à côté de Mode

**Demande directe de l'utilisateur** : "dans la partie /search on ajoute à côté de Mode la
section Demandes, mais quand on clique sur 'Toutes catégories' elle n'inclut que Mode et
Immobilier, ensuite quand on clique sur demandes, je veux qu'on affiche déjà la section demande
aussi sur la page search."

**Contexte technique** : une "demande de recherche" (`SearchRequest`, collection Firestore
`search_requests`) est un contenu **acheteur** — l'inverse d'une annonce vendeur — jamais
indexé dans Algolia, avec son propre composant `SearchRequestsListClient.tsx` (hero + 3 filtres
select + grille), auparavant uniquement accessible via `/demandes-recherche`.

**Implémentation** :
- `CategoryFilterPills.tsx` : nouveau pill fixe "Demandes" (`DEMANDES_CATEGORY_NAME`, exporté),
  ajouté à côté des racines réelles (`Immobilier`/`Mode`) mais **volontairement séparé** du
  tableau `categories` issu de `/api/categories/active` — donc jamais un document
  `listing_categories`, et jamais agrégé par "Toutes catégories" (category vide), qui ne
  continue de filtrer que sur les racines réellement issues de cette API. Effet de bord
  positif : la rangée de pills, auparavant masquée tant qu'il n'y avait pas 2 catégories
  actives, est désormais toujours utile (Demandes est toujours une vraie 2e option) — guard
  `categories.length < 2` retiré.
- `SearchDesktopPage.tsx`/`SearchMobilePage.tsx` : `isDemandesTab = category === 'Demandes'`.
  Quand actif, bascule tout le panneau de résultats vers `SearchRequestsListClient` directement
  intégré (pas de navigation) — masque `FilterSearchDesktopPageSection`/`FilterModalHomePage`
  (province/prix/surface immobilier n'ont aucune prise sur une demande) et
  `CategoryLeafFilterPills`/le titre "Résultats de la recherche"/nbHits (spécifiques à
  Algolia). Les hooks `react-instantsearch` continuent de s'exécuter normalement (règle des
  Hooks, contexte `InstantSearch` toujours monté) mais leur résultat est simplement ignoré
  dans ce mode.

**Vérification** :
- Jest (`category-filter-pills.test.tsx`, 3 nouveaux cas) : pill Demandes toujours affiché
  (même avec une seule racine réelle active) ; clic dessus pose `category=Demandes` et
  réinitialise tout le reste ; "Toutes catégories" ne pose jamais `category` (n'agrège donc
  jamais Demandes).
- Jest (`search-desktop-page.test.tsx`, `search-mobile-page.test.tsx`, 1 cas chacun) :
  `category=Demandes` bascule bien vers `SearchRequestsListClient`, sans le panneau de filtres
  immobilier ni la pagination Algolia.
- Vérifié visuellement par capture d'écran (fichiers de test jetables, supprimés après
  vérification), desktop et mobile : pastille "Demandes" visible à côté de Mode ; clic dessus
  → hero + filtres + grille des demandes s'affichent directement sur `/search`, panneau
  immobilier disparu ; retour sur "Toutes catégories" → grille Immobilier+Mode normale
  (901 annonces), Demandes non incluse.
- `tsc --noEmit` propre, suite Jest complète 1544/1544.
- Régression : `property-filters-search.spec.ts` + `lot8e-search-consultation.spec.ts`
  rejoués — 14/15 (le seul échec est le 404 pré-existant déjà documenté plus haut, sans
  rapport, confirmé par `git diff`).

**⚠️ Bug pré-existant découvert en marge, signalé mais non corrigé (hors périmètre de cette
demande)** : en chronométrant les captures d'écran, `document.body.scrollHeight` sur `/search`
(onglet normal, Immobilier+Mode) grossit de façon non bornée en restant simplement immobile —
1200px à t=1s, 7919px à t=3s, 21595px à t=6s, sans le moindre scroll utilisateur. L'observer
d'infinite-scroll (`IntersectionObserver` + `requestMore()`/`showMore()`,
`SearchDesktopPage.tsx`) semble se redéclencher en boucle au lieu de s'arrêter une fois la
zone sentinelle chargée — chaque page Algolia chargée agrandit la zone, ce qui peut re-
déclencher l'observer immédiatement selon la position du sentinel. Confirmé indépendant de
l'ajout de Demandes (reproduit sur `/search` sans jamais y toucher). Risque réel : surcharge de
requêtes Algolia (coût/quota) et page qui devient de plus en plus lourde sans action de
l'utilisateur.

**Fichiers** : `src/components/search/CategoryFilterPills.tsx`,
`src/components/search/SearchDesktopPage.tsx`, `src/components/search/SearchMobilePage.tsx`,
`__tests__/components/category-filter-pills.test.tsx`,
`__tests__/components/search-desktop-page.test.tsx`,
`__tests__/components/search-mobile-page.test.tsx`.

*Créé le 2026-09-03.*

## 🟢 Fonctionnalités ajoutées — Demandes : filtres mobile en Sheet + partage Facebook automatique

**Demandes directes de l'utilisateur** (suite à l'entrée précédente) :
1. "en vue mobile mieux vaut avoir un bouton de filtres qui ouvre une sorte de drawer avec les
   3 filtres car je trouve qu'en vue mobile les 3 filtres alignés comme ça prennent trop de
   place."
2. "on va faire comme avec la création d'annonce. Une fois une personne publie une recherche
   précise, cette dernière sera partagée automatiquement sur ma page facebook comme on a fait
   avec les annonces avec l'api facebook qu'on a déjà intégré."

### 1. Filtres mobile en Sheet (`SearchRequestsListClient.tsx`)

Les 3 selects (type de bien, location/vente, ville), auparavant alignés en permanence
(`flex flex-wrap`), prenaient trop de place empilés sur mobile. Repris exactement le pattern déjà
établi dans ce dépôt (`AdManagementPage.tsx`/`MyReelsClient.tsx`, `@trouve-ton-nkama/ui/sheet`) :
- Desktop (`hidden sm:flex`) : les 3 selects inline, inchangé.
- Mobile (`sm:hidden`) : bouton icône rond "Filtres" (pastille visible si un filtre est actif)
  ouvrant un Sheet du bas (`side="bottom"`, 70vh) avec les mêmes 3 champs
  (`renderFilterFields(idPrefix)`, factorisé pour éviter les ids DOM dupliqués), pied de page
  "Réinitialiser" (désactivé sans filtre actif, ne ferme pas le Sheet) / "Voir les résultats"
  (`SheetClose`, ferme).
- Sheet rendu `open`/`onOpenChange` (état contrôlé) plutôt que non contrôlé : seule façon de
  réutiliser tel quel le mock de test déjà établi par `ad-management-page.test.tsx`.

**Vérification** : Jest (`search-requests-list-client.test.tsx`, 1 nouveau cas complet — ouvre
le Sheet, vérifie Réinitialiser désactivé puis activé après un filtre choisi DANS le Sheet,
vérifie que `getSearchRequests` reçoit bien ce filtre, réinitialise sans fermer, ferme via
"Voir les résultats") + 9 cas existants toujours verts (le Sheet fermé par défaut n'ajoute
aucun select dupliqué dans le DOM — Radix ne rend son contenu qu'à l'ouverture, contrairement
au pattern CSS `hidden`/`sm:hidden` toujours-dans-le-DOM utilisé ailleurs dans cette session).
Vérifié visuellement par capture d'écran (fichier de test jetable, supprimé après vérification) :
bouton compact replié, Sheet du bas avec les 3 filtres à l'ouverture. `tsc --noEmit` propre,
suite Jest complète 1545/1545.

### 2. Partage Facebook automatique à l'approbation d'une demande

Réutilise intégralement l'intégration Facebook déjà en place pour les annonces
(`functions/src/social/`) : `publishLinkToPage`/`resolveFacebookPageConfig`
(`facebook-page.client.ts`, Graph API `POST /{page-id}/feed`) sont génériques et repris sans
modification — même secrets Firebase déjà configurés (`FACEBOOK_PAGE_ID`,
`FACEBOOK_PAGE_ACCESS_TOKEN`), aucune nouvelle configuration compte/app Meta nécessaire.

Nouveau, propre à `search_requests` (collection distincte, contenu acheteur — l'inverse d'une
annonce vendeur) :
- `search-request-facebook.policy.ts` (module pur, comme `facebook-page.policy.ts`) :
  `shouldPublishApprovedSearchRequest` (même garde-fous que les annonces — transition vers
  `APPROVED` uniquement, jamais si déjà `facebookPost.id`, jamais si `state === 'ARCHIVED'`),
  `buildSearchRequestPostMessage` (type de bien + location/vente + ville/quartier + budget +
  description + lien + pied institutionnel commun), `buildSearchRequestsListUrl`.
- Nouveau trigger `onSearchRequestApprovedPublishToFacebook`
  (`functions/src/social/index.ts`, exporté depuis `functions/src/index.ts`) : `onUpdate` sur
  `search_requests/{searchRequestId}`, même structure que `onListingApprovedPublishToFacebook`
  (échec = log seul, pas de relance ; succès = marqueur d'idempotence `facebookPost` sur le doc).

**Décision explicite prise avec l'utilisateur** (une annonce a sa propre page publique
`/annonce/{id}` dont les balises OpenGraph donnent une belle carte Facebook — une demande de
recherche n'en a aucune) : le post pointe vers `/demandes-recherche` (la liste), **pas** de
nouvelle page individuelle `/demandes-recherche/{id}` — éviterait une URL publique indexable
stable exposant le numéro WhatsApp d'une demande précise, pour un gain (jolie carte d'aperçu)
jugé secondaire par rapport à ce risque.

**Vérification** : Jest (`search-request-facebook.policy.test.ts`, 15 nouveaux cas, mêmes
scénarios que `facebook-page.policy.test.ts` — transition APPROVED, non-republication,
marqueur d'idempotence, demande archivée, construction du message avec budget partiel/absent,
libellé français du type de bien, repli ville→quartier→province, pied de post). `tsc --noEmit`
propre sur `functions/`, suite Jest complète 128/128 sans régression. Pas de test e2e/trigger
direct — même limite déjà acceptée pour le trigger annonces équivalent (aucun test n'existe non
plus pour `onListingApprovedPublishToFacebook` lui-même, uniquement pour ses briques pures).

**Reste à déployer** : comme pour le correctif AdSense/expire-promotions plus haut, ce nouveau
trigger Cloud Functions ne prend effet qu'après `firebase deploy --only functions` — pas fait
dans le cadre de cette session (action distincte, pas demandée).

**Fichiers** : `src/components/search-requests/SearchRequestsListClient.tsx`,
`__tests__/components/search-requests-list-client.test.tsx`,
`functions/src/social/search-request-facebook.policy.ts` (nouveau),
`functions/src/social/index.ts`, `functions/src/index.ts`,
`functions/__tests__/social/search-request-facebook.policy.test.ts` (nouveau).

*Créé le 2026-09-03.*

### Retouche — bouton Filtres déplacé sur la même ligne que "Toutes les demandes"

**Demande directe de l'utilisateur**, capture d'écran à l'appui : le bouton Filtres mobile
(ajouté ci-dessus) se retrouvait seul, centré au-dessus du titre "Toutes les demandes" au lieu
d'être sur la même ligne.

**Correctif** : le `<Sheet>` (panneau + contenu) reste unique, mais n'a plus de `SheetTrigger`
dédié — juste un bouton simple contrôlé par le même state (`isFilterSheetOpen`), factorisé en
`renderFilterTriggerButton()` et posé à deux endroits désormais : dans la ligne du titre
"Toutes les demandes" (`flex items-center justify-between`, demande explicite), et dans l'état
vide (pour ne pas rendre les filtres inaccessibles quand cette section ne s'affiche pas — ex.
un filtre actif qui ne retourne aucun résultat).

**Vérification** : Jest (2 nouveaux cas dans `search-requests-list-client.test.tsx` — le bouton
partage bien le même parent flex que le titre ; le test du Sheet existant adapté pour attendre
que l'état se stabilise avant de chercher le bouton, qui n'est plus rendu inconditionnellement
dès le montage). Vérifié visuellement par capture d'écran (fichier de test jetable, supprimé
après vérification) : bouton bien aligné à droite du titre "Toutes les demandes". `tsc --noEmit`
propre, suite Jest complète 1546/1546.

**Fichiers** : `src/components/search-requests/SearchRequestsListClient.tsx`,
`__tests__/components/search-requests-list-client.test.tsx`.

*Créé le 2026-09-03.*

---

## 🔴 Corrigé — Tous les filtres de /search?category=Demandes (type, location/vente, ville) étaient silencieusement cassés en production

**Demande directe de l'utilisateur** : "fais maintenant les tests jest et e2e dans la page
http://localhost:3000/search?category=Demandes. Tu vas tester les filtres et la création d'une
recherche" — en écrivant le premier e2e réel de ce filtre (données Firestore réelles, pas
mockées), les trois selects (type de bien, location/vente, ville) n'avaient strictement aucun
effet visible : changer leur valeur ne modifiait jamais la liste affichée.

**Repro initial** : sur `/search?category=Demandes`, sélectionner n'importe quelle valeur dans
un des trois selects — la liste reste identique à avant le changement, aucune erreur visible à
l'écran.

**Cause** : root-causé via un fichier de test jetable (`_debug_sr_filter.spec.ts`, avec des
listeners `page.on('console', …)`/`page.on('pageerror', …)`, supprimé après diagnostic) — la
vraie cause est une **erreur Firestore silencieusement avalée** : `The query requires an
index...`. `getSearchRequests()` (`src/db/search-request.db.ts`) applique `where(typeProperty
==)`/`where(transactionType==)`/`where(city==)` en plus de `where(state==)`,
`where(moderationStatus==)` et `orderBy(createdAt desc)` déjà indexés — mais
`firestore.indexes.json` ne contenait que 3 index `search_requests` (aucun ne couvrant ces
combinaisons). La promesse rejetée n'était affichée nulle part côté composant
(`SearchRequestsListClient.tsx`) : l'ancien état restait affiché tel quel, donnant l'illusion
d'un select "qui ne fait rien" plutôt que d'une vraie erreur.

**Correctif** : 7 nouveaux index composites ajoutés à `firestore.indexes.json`, couvrant chaque
combinaison atteignable des 3 selects optionnels (`typeProperty` seul, `transactionType` seul,
`city` seul, et les 4 combinaisons à 2/3), toujours avec `state`+`moderationStatus` en égalité
et `createdAt desc` en tri — même schéma que les 3 index déjà en place.

**Déployé sur dev uniquement** (`firebase deploy --only firestore:indexes --project dev`),
vérifié construits (polling direct). **Pas encore déployé sur prod** — c'est pourtant un bug
actuellement live sur tonnkama.com, à déployer dès que confirmé par l'utilisateur.

**Fichier** : `firestore.indexes.json`.

**Test qui le prouve** : `__tests__/e2e/search-requests-filters.spec.ts` — les 3 tests filtre
simple (type, transaction, ville) échouaient tous avant le déploiement des index (liste
inchangée après sélection), passent après.

---

## 🟢 Corrigé — le bouton Filtres mobile disparaissait quand un filtre combiné ne laissait qu'une demande boostée

**Trouvé en écrivant** `search-requests-filters.spec.ts` (voir bug ci-dessus, même session de
travail) : une fois les index corrigés, un filtre combiné (ex. type=Villa + ville=Libreville) ne
laissant aucune demande "régulière" mais une demande boostée toujours affichée (elle ignore
volontairement les filtres, voir `getBoostedSearchRequests`) faisait aussi disparaître le bouton
"Filtres" mobile — plus aucun moyen de le rouvrir sans recharger la page.

**Cause** : `renderFilterTriggerButton()` n'était rendu qu'à deux endroits, tous deux
conditionnés (directement ou indirectement) sur `boosted.length === 0` : à côté du titre "Toutes
les demandes" (qui ne s'affiche que si `items.length > 0`), et dans le bloc état-vide (qui
exigeait `boosted.length === 0 && items.length === 0`). Dès qu'une boostée restait affichée
malgré un `items` vide, aucun des deux blocs ne rendait le bouton.

**Correctif** : découplé la condition du bouton de `boosted.length` — il s'affiche désormais dès
que `items.length === 0`, que des demandes boostées restent visibles par ailleurs ou non ; seul
le message texte "Aucune demande..." reste conditionné sur `boosted.length === 0` en plus.

**Fichier** : `src/components/search-requests/SearchRequestsListClient.tsx`.

**Test qui le prouve** : `search-requests-filters.spec.ts`, test mobile dédié ("mobile :
combinaison sans resultat regulier (mais une boostee reste) ne fait pas disparaître le bouton
Filtres") — échouait avant le correctif, passe après. Couverture Jest ajoutée en miroir dans
`search-requests-list-client.test.tsx` ("garde le bouton Filtres accessible quand seule une
demande boostee reste").

---

## 🟢 Couverture ajoutée — `search-requests-filters.spec.ts` (filtres de /search?category=Demandes, vraie lecture Firestore)

7 tests, données Firestore réelles (un studio à louer à Libreville, une villa à vendre à
Port-Gentil, une demande boostée de type distinct pour éviter toute ambiguïté), desktop +
mobile :

- Le pill "Demandes" affiche bien les vraies demandes (boostée en tête dans "Recherches
  urgentes", le reste sous "Toutes les demandes").
- Filtre type de bien, filtre location/vente, filtre ville (desktop, select inline) — skip
  proprement sous 640px de large (`viewportSize().width < 640`) : cette section est CSS-masquée
  sur mobile (`hidden sm:flex`), l'équivalent y est couvert par les tests Sheet mobile.
- Combinaison de filtres sans résultat régulier : la boostée reste affichée, "Toutes les
  demandes" disparaît (desktop).
- Mobile : la même combinaison ne fait pas disparaître le bouton Filtres (régression du bug
  ci-dessus).
- Mobile : le Sheet de filtres applique un filtre réel puis le retire via "Réinitialiser".

Rodé sur `chromium-desktop-dev` (7/7) et `chromium-mobile` (3 passent, 4 skip proprement).

**Pas couvert par ce passage** : la création réelle d'une demande de recherche
(`/demandes-recherche/publier`), qui passe par un paiement MyPayGa réel — aucun sandbox
documenté dans ce dépôt, aucun e2e existant dans ce codebase n'a jamais mené un flux MyPayGa
(dons, crédits, ou demandes de recherche) jusqu'à une confirmation réelle. Comment approcher ce
test reste à trancher avec l'utilisateur.

**Fichiers** : `__tests__/e2e/search-requests-filters.spec.ts` (nouveau),
`__tests__/e2e/helpers/firebase-admin.ts` (`seedSearchRequest`/`deleteSearchRequests`),
`__tests__/components/search-requests-list-client.test.tsx`,
`src/components/search-requests/SearchRequestsListClient.tsx`, `firestore.indexes.json`.

*Créé le 2026-09-03.*

---

## 🟢 Couverture ajoutée — `search-requests-create.spec.ts` (création réelle d'une demande de recherche, jusqu'au paiement MyPayGa live)

**Décision explicite prise avec l'utilisateur** (voir la question posée en cours de session) sur
la seule partie qui restait non couverte de la demande initiale ("tester les filtres et la
création d'une recherche") : appeler pour de vrai `/api/search-requests/initiate` — donc un
vrai appel HTTP à l'API MyPayGa live (`https://api.mypayga.com`, aucun sandbox documenté dans ce
dépôt) — mais sans jamais compléter le paiement réel. Numéro payeur fourni explicitement par
l'utilisateur pour cet usage (077401202, format Airtel Money).

**Ce qui est réellement testé** :
- Remplissage complet du formulaire `/demandes-recherche/publier` (Select Type de bien/Radix,
  ville, budgets, description, WhatsApp, numéro payeur Mobile Money).
- Soumission réelle → vrai appel à la Cloud Function `initiateSearchRequestPayment`, qui appelle
  elle-même l'API MyPayGa live. `initiateResponse.ok()` et `transactionId` vérifiés sur la vraie
  réponse réseau (`page.waitForResponse`).
- Vérification en base (Admin SDK) que le document `search_requests/{transactionId}` existe bien
  en `paymentStatus: 'pending_confirmation'`, `moderationStatus: null` — preuve que
  l'initiation a réellement écrit en Firestore, pas seulement renvoyé un succès factice.
- La confirmation (ce que ferait normalement le webhook MyPayGa signé) est **simulée** via un
  nouveau helper Admin SDK, `simulateSearchRequestPaymentConfirmed` — reproduit exactement les
  mêmes champs que `applySearchRequestPaymentOnce` dans le vrai webhook
  (`functions/src/payments/search-requests/webhook.ts`) sans jamais appeler MyPayGa ni compléter
  un vrai paiement.
- Le polling client (3 s, `use-search-request-payment.ts`) détecte cette confirmation et affiche
  l'écran de succès — preuve que le polling fonctionne réellement, pas juste que l'API répond.
- Relecture finale en base : tous les champs soumis (`typeProperty`, `transactionType`, `city`,
  budgets, `description`, `whatsappContact`) et les champs posés par la confirmation
  (`paymentStatus: 'confirmed'`, `moderationStatus: 'PENDING'`, `state: 'IN_PROGRESS'`,
  `boostPaid: false`, `amountPaidXaf: 500`) vérifiés directement en base, pas seulement à
  l'écran.

**Effet de bord réel, à savoir** : si l'initiation aboutit, MyPayGa envoie une vraie invite de
paiement Mobile Money au numéro payeur — sans risque (aucun argent ne bouge sans code MoMo
saisi sur ce téléphone), mais un vrai effet de bord externe à chaque exécution complète de ce
test. `test.skip` restreint volontairement ce test à `chromium-desktop-dev` uniquement — le
répéter sur plusieurs projets Playwright enverrait plusieurs invites réelles par exécution
complète de la suite.

**Bug d'environnement rencontré en cours de route (pas un bug produit)** : le serveur dev
Playwright réutilisé (`localhost:3001`) était mort au moment de lancer ce test précis — les
deux processus `next dev` visibles dans `ps aux` ne répondaient sur aucun port surveillé
(`lsof` : rien sur 3001). Playwright a alors tenté de démarrer son propre serveur, qui a échoué
à se compiler dans les 180s impartis (échecs de résolution de polices Google Fonts en plus) —
premier essai du test a échoué avec `TypeError: fetch failed` côté route
`/api/search-requests/initiate` (avant même d'atteindre MyPayGa, donc **aucune vraie invite de
paiement envoyée à ce premier essai**). Un serveur `test:e2e:dev` dédié relancé manuellement en
arrière-plan et attendu jusqu'à répondre (`curl` en boucle) avant de rejouer le test a résolu le
problème — le second essai a réussi normalement, avec le vrai appel MyPayGa cette fois.

**Fichiers** : `__tests__/e2e/search-requests-create.spec.ts` (nouveau),
`__tests__/e2e/helpers/firebase-admin.ts` (`simulateSearchRequestPaymentConfirmed`,
`getSearchRequest`).

*Créé le 2026-09-03.*

---

## 🟢 Corrigé — Sur /publicite, le CTA mobile fixe recouvrait les contrôles du lecteur vidéo

**Signalé directement par l'utilisateur** après mise en ligne de la landing `/publicite` : sur
mobile, la barre "Créer ma publicité — X FCFA" (fixe en bas d'écran une fois le hero dépassé)
restait affichée devant la vidéo de présentation, recouvrant le bouton lecture puis les
contrôles natifs une fois la lecture démarrée.

**Cause** : `PubliciteLandingClient.tsx` ne calculait la visibilité de la barre fixe qu'à partir
d'un seul `IntersectionObserver` (sur `#hero-cta`) — dès que le hero sortait du champ, la barre
restait affichée pour le reste du défilement, y compris pendant que le lecteur vidéo occupait
l'écran.

**Correctif** : un second `IntersectionObserver` observe désormais `#video-player` (nouvel id
posé sur le conteneur du lecteur dans `PubliciteVideoSection.tsx`, `threshold: 0` — se déclenche
dès qu'un seul pixel du lecteur entre/sort du viewport). La barre fixe n'est affichée que si le
hero est dépassé **ET** que le lecteur n'est pas à l'écran : `showStickyCta = isPastHero &&
!isVideoPlayerVisible`.

**Vérifié en réel** (captures d'écran, vraie lecture démarrée avec sous-titres) : barre visible
entre le hero et la vidéo, disparaît dès que le lecteur entre dans le viewport (avant ET pendant
la lecture, contrôles natifs inclus), réapparaît après la section vidéo (section tarifs).

**Fichiers** : `src/components/publicite/PubliciteLandingClient.tsx`,
`src/components/publicite/PubliciteVideoSection.tsx` (id `video-player`),
`__tests__/e2e/publicite-landing.spec.ts` (nouveau test dédié, desktop + mobile).

*Créé le 2026-09-04.*

---

## 🔴 Corrigé — LCP mobile à 9,5s sur les pages /immobilier/* et /search (Search Console)

**Signalé directement par l'utilisateur** via un rapport Google Search Console (Core Web
Vitals) : "Problème LCP : dépasse 4s (mobile)", 1 340 URL concernées, toutes regroupées sous un
seul groupe LCP à **9,5 s**, exemple `https://www.tonnkama.com/immobilier/location/maison/libreville`.
Premier signalé le 25/07/2025 — un problème de fond, pas un accident récent.

**Diagnostic** : reproduit et confirmé en conditions contrôlées (Playwright + CDP, throttling
CPU 4x + réseau "Slow 4G" ~1,6 Mbps, profil proche de Lighthouse mobile) directement contre la
page en production — **LCP mesuré à 9500ms, exactement le chiffre de Search Console**, élément
confirmé `<img>` (la toute première card de la grille de résultats).

**Cause** : aucune image de `ListingCard.tsx`/`PropertyCard.tsx` (composant partagé par
`/immobilier/*`, `/search` et l'accueil) n'avait la prop `priority` de next/image — la première
card d'une grille, quasi toujours l'élément LCP de la page, se voyait donc appliquer
`loading="lazy"` par défaut. Une image lazy-loadée n'entame son téléchargement qu'après
confirmation par IntersectionObserver qu'elle approche du viewport — donc après hydratation
React, pas pendant le parsing initial du HTML. Sur un CPU mobile throttlé, ce délai
d'hydratation à lui seul explique l'essentiel des 9,5 secondes.

**Correctif** : nouvelle prop `priority?: boolean` sur `ListingCard`/`PropertyCard`, transmise à
`next/image`. Retire `loading="lazy"` UNIQUEMENT sur la toute première card de chaque grille
(jamais les suivantes, pour ne pas dégrader bande passante/CPU en aval) :
- `ImmobilierPropertyCardsGrid.tsx` (`/immobilier/*` — la page exacte signalée) ;
- `SearchDesktopPage.tsx` et `SearchMobilePage.tsx` (`/search`, même motif `feedGroups` que la
  grille immobilier).

**Vérifié en réel** (pas seulement en théorie) : sur `localhost` pointé vers les mêmes données
prod, avant le correctif la première image portait `loading="lazy"` ; après, elle n'a plus cet
attribut et Next.js injecte un `<link rel="preload" as="image">` correspondant dans `<head>` —
la deuxième image de la grille, elle, reste bien `loading="lazy"` (pas de régression). Vérifié à
la fois sur `/immobilier/location/maison/libreville` et sur `/search`, desktop et mobile.

**Écarté du périmètre, vérifié sans être touché** : le carrousel de l'accueil
(`ListingCardsCarousel.tsx`, react-slick) utilise le même `ListingCard` mais mesuré non-
responsable — l'élément LCP réel de l'accueil est le `<h1>` du hero, pas une image de carte.
React-slick clone/réordonne son DOM pour le défilement infini, ce qui rend le mapping
"premier élément du tableau = premier élément visuel" incertain sans vérification visuelle
poussée — pas touché tant que ce n'est pas la cause mesurée d'un vrai problème.

**Non traité, recommandé séparément** : `next.config.ts` a `images.unoptimized: true` — désactive
entièrement l'optimisation d'image de Next.js (pas de redimensionnement responsive, pas de
conversion WebP/AVIF automatique) sur tout le site, réglage présent depuis le tout premier
`next.config.ts` du projet (2024-12-20), sans justification documentée. `sharp` est déjà une
dépendance du projet (`package.json`) — le prérequis pour activer l'optimiseur en déploiement
`output: 'standalone'` est donc déjà réuni. Flipper ce réglage (`unoptimized: false`) apporterait
un gain supplémentaire (poids d'image réduit, format moderne) mais touche TOUTES les images du
site — mérite sa propre validation (vérifier que `sharp` fonctionne bien dans le runtime Docker/
Cloud Run réel, mesurer l'impact CPU) plutôt que d'être fait dans la foulée de ce correctif ciblé.

**Fichiers** : `src/components/listing/ListingCard.tsx` (prop `priority`, `sizes` ajouté à la
densité "standard"), `src/components/home-page/PropertyCard.tsx` (relai de la prop),
`src/components/seo/ImmobilierPropertyCardsGrid.tsx`, `src/components/search/SearchDesktopPage.tsx`,
`src/components/search/SearchMobilePage.tsx`, `__tests__/components/immobilier-property-cards-grid.test.tsx`
(nouveau), `__tests__/components/search-desktop-page.test.tsx`, `__tests__/components/search-mobile-page.test.tsx`.

*Créé le 2026-09-04.*

---

## 🔴 Corrigé — Le bouton "Contacter sur WhatsApp" d'une demande de recherche ne fonctionnait pour aucune demande

**Signalé indirectement par l'utilisateur** (« il faut mettre l'indicatif +241... en enlevant le
1er 0 ») en corrigeant le contact d'une demande créée manuellement — creusé plus loin, révèle un
vrai bug déjà en production, pas seulement un problème d'affichage.

**Cause** : `whatsappContact` était stocké au format local gabonais (`"062459646"`, 0 initial) —
aussi bien via le flux public payant (`initiateSearchRequestPayment.ts`, `toLocalPhone`) que via
la création manuelle admin. `SearchRequestCard.tsx` (rendu public, `/demandes-recherche`)
construisait le lien avec `https://wa.me/${item.whatsappContact}` **tel quel** — or wa.me exige
l'indicatif pays sans le 0 initial (`24162459646`, pas `062459646`). Résultat : le bouton
"Contacter sur WhatsApp" était non fonctionnel pour **toute** demande de recherche déjà publiée
sur le site, depuis le lancement de la fonctionnalité.

**Correctif, à deux niveaux** :
- **Stockage** (nouvelles demandes) : `whatsappContact` est désormais persisté au format
  `+241...` — dans `initiateSearchRequestPayment.ts` (flux public payant, nouvelle fonction
  `toGabonE164` dans `mypayga/config.ts`) et dans les routes admin de création/modification
  (`toGabonWhatsappE164`, `location-maison-admin/src/lib/phone/gabon-whatsapp.ts`).
- **Affichage/lien** (toutes les demandes, y compris celles déjà en base au format local) :
  `SearchRequestCard.tsx` construit désormais le lien via `toWaMeDigits()`
  (`src/lib/phone/gabon-whatsapp.ts`), qui reconnaît indifféremment l'ancien format local et le
  nouveau format `+241...` — le bouton redevient fonctionnel pour les demandes existantes sans
  nécessiter de migration des données.

**Fichiers** : `apps/location-maison/src/lib/phone/gabon-whatsapp.ts` (nouveau),
`apps/location-maison/src/components/search-requests/SearchRequestCard.tsx`,
`apps/location-maison/functions/src/payments/mypayga/config.ts` (`toGabonE164`),
`apps/location-maison/functions/src/payments/search-requests/initiateSearchRequestPayment.ts`,
`apps/location-maison-admin/src/lib/phone/gabon-whatsapp.ts` (nouveau),
`apps/location-maison-admin/src/app/api/admin/v1/search-requests/route.ts`,
`apps/location-maison-admin/src/app/api/admin/v1/search-requests/[searchRequestId]/route.ts`.

**Non traité, à considérer séparément** : les demandes déjà en base côté Firestore restent au
format local tant qu'elles ne sont pas éditées (le correctif d'affichage les couvre déjà, donc
pas urgent) — une migration en masse (script Admin SDK, même principe que les correctifs
manuels de cette session) normaliserait aussi le champ stocké, si souhaité.

*Créé le 2026-09-04.*
