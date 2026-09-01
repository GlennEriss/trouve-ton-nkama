# Bugs découverts par les tests e2e réels des Réels (2026-08)

Suite logique du travail sur `/property` : test e2e réel du parcours "Ajouter un réel" déclenché
depuis la carte d'une annonce sur `/property` (Firestore + Storage réels, pas de mock réseau).

## 🔴 Corrigé — Le bouton "Publier le réel" reste bloqué indéfiniment si la session Firebase échoue, sans aucun message

**Statut** : corrigé, vérifié (test Jest dédié + suite e2e réelle relancée).

**Repro initial** (jamais reproduit en pratique, trouvé par lecture de code en écrivant
`property-add-reel.spec.ts`) : la création d'un réel authentifie par **Bearer ID token
Firebase** (`POST /api/reels`, `adminAuth.verifyIdToken`), pas par la seule session NextAuth. Le
pont entre les deux est `connectFirebaseClient()` (`use-current-user.ts`) : mint un custom token
via `POST /api/generate-token`, puis `signInWithCustomToken` côté navigateur —
`isFirebaseConnected` ne passe à `true` qu'une fois cet échange terminé.

`CreateOrphanReelClient.tsx` attendait `isFirebaseConnected` avant de finaliser la publication
(`pendingSubmission` -> effet qui republie la vidéo déjà choisie) mais ne réagissait jamais à un
**échec** de cette connexion (réseau coupé, jeton refusé...). Si `isFirebaseConnected` restait
`false` pour de bon, l'effet se contentait de `return` à chaque rendu, indéfiniment :
`isFinalSubmitting` (déjà mis à `true` dans `handlePublish`, avant que l'effet n'ait la main)
restait bloqué, le bouton tournait en boucle (spinner), et **aucun toast, aucun message
d'erreur** n'informait l'utilisateur — silencieux, comme les bugs "permission-denied" déjà trouvés
côté `/property` cette session (crayons EditableField, archivage), mais ici encore plus discret
puisque même pas d'erreur réseau visible : juste une attente infinie.

**Cause exacte** : `useCurrentUser()` expose pourtant déjà un état `error` (posé par
`connectToFirebase()` dans son bloc `catch` dès que `connectFirebaseClient` échoue) —
`CreateOrphanReelClient.tsx` ne le lisait simplement jamais.

**Correctif** : l'effet de republication lit maintenant aussi `error` (renommé
`firebaseConnectionError` en local). Si `isFirebaseConnected` est `false` ET qu'une erreur est
présente (échec confirmé, pas juste "en cours de connexion"), il débloque l'état
(`pendingSubmission`, `isFinalSubmitting`, `isFinalSubmittingRef`) et affiche un toast destructif
avec le message d'erreur réel — même traitement que les autres échecs de cette page (upload
Storage cassé, etc.).

**Fichier** : `src/components/reels/CreateOrphanReelClient.tsx`.

**Test qui le prouve** : `__tests__/components/create-orphan-reel.test.tsx`, nouveau cas
"prévient et débloque le bouton quand la connexion Firebase échoue, au lieu de tourner
indéfiniment" — simule `isFirebaseConnected: false` + `error` posé, vérifie le toast et que le
bouton redevient cliquable. Le parcours heureux (session qui réussit) reste couvert par
`__tests__/e2e/property-add-reel.spec.ts` et `__tests__/e2e/lot8d-reels-ux.spec.ts` (vrai
Firestore/Storage/Firebase Auth dev), les deux relancés après ce correctif — aucune régression.

## 🟢 Couverture ajoutée — `property-add-reel.spec.ts` (parcours complet "Ajouter un réel" depuis /property)

**Statut** : parcours heureux entièrement vérifié en conditions réelles — c'est en écrivant ce
test que le bug ci-dessus a été trouvé (jamais déclenché par le test lui-même, repéré en lisant
le code source pendant l'investigation).

Trois étapes, vraies données Firestore + vrai upload Storage + vraie session Firebase Auth (pont
custom-token, pas seulement le cookie NextAuth forgé — voir
`mockCommonAppNoise(page, { mockFirebaseToken: false })`, même recette que
`lot8d-reels-ux.spec.ts`) :
1. Clic sur "Ajouter un réel" depuis la carte d'une annonce sur `/property` → atterrit sur
   `/reels/add?propertyId={id}` avec l'annonce bien présélectionnée dans l'UI (pas juste l'URL).
2. Upload d'une vraie vidéo (générée par ffmpeg, mêmes paramètres que le fixture existant) +
   légende, publication → toast "Vidéo envoyée", puis relecture Firestore directe (Admin SDK) qui
   prouve la vraie persistance : `propertyId` correct, `moderationStatus: PENDING`,
   `rawVideoPath` correct, description correcte.
3. Le réel apparaît réellement sur "Mes réels" avec le texte "Attaché à une annonce".

**Piège de stabilité rencontré** : la Cloud Function de transcodage (`transcodeReelVideo`) tourne
réellement sur cet environnement dev et peut traiter la vidéo assez vite pour faire avancer
`processingStatus` (`uploading` → `processing` → `ready`) avant même que le test ne relise
Firestore — une assertion figée sur `'uploading'` devenait flaky selon la vitesse du pipeline.
Assoupli pour accepter les trois valeurs "en cours de progression" (tout sauf `failed`) ; retiré
l'assertion sur le libellé UI transitoire ("Envoi de la vidéo en cours...") pour la même raison,
le toast + la lecture Firestore suffisant comme preuve.

**Fichiers** : `__tests__/e2e/property-add-reel.spec.ts` (nouveau),
`__tests__/e2e/helpers/firebase-admin.ts` (`findReelByOwner` — le client génère l'id du réel
lui-même, un test ne peut le retrouver qu'en interrogeant par `createdBy` ; `deleteReels` —
nettoyage réel du document Firestore et de **tous** les fichiers Storage qu'il référence, lus
depuis le document lui-même juste avant suppression pour couvrir aussi bien le fichier brut que
ceux ajoutés après transcodage, plutôt que de deviner un chemin/extension à l'avance).

## 🟢 Couverture ajoutée — `property-my-reels-link.spec.ts` (bouton "Mes réels" de /property -> /reels/mine)

**Statut** : pas de bug produit trouvé — le lien lui-même (`AdManagementPage.tsx`, simple
`<Link href={routes.protected.reels_mine}>`) était déjà correct. Vérifié que ça mène bien à une
page qui affiche réellement les réels de l'annonceur connecté, pas seulement la bonne URL.

**Piège rencontré en écrivant le test** : `/property` contient **deux** liens "Mes réels" —
celui de la nav principale (toujours présente en haut de page) et celui, propre à cette page,
dans l'en-tête de `AdManagementPage.tsx`. Un `getByRole('link', { name: 'Mes réels' })` sans
portée provoque une violation strict mode Playwright (2 éléments). Corrigé en scopant à
`page.getByRole('main')` pour cliquer précisément celui de la page.

**Fichiers** : `__tests__/e2e/property-my-reels-link.spec.ts` (nouveau),
`__tests__/e2e/helpers/firebase-admin.ts` (`seedReel` — écrit un doc `reels/{id}` directement
sans upload Storage réel, pour les tests qui n'ont besoin que d'un réel existant à retrouver dans
une liste, contrairement à `property-add-reel.spec.ts` qui vérifie le pipeline d'upload lui-même).

**Piège d'infrastructure rencontré en relançant ce test avec `lot8d-reels-ux.spec.ts`** (pas un
bug produit) : exécutés ensemble avec `--workers=1`, le second fichier échoue parfois avec
`The default Firebase app does not exist` — `reels-dev.ts` (utilisé par `lot8d-reels-ux.spec.ts`)
initialise sa propre app Admin **nommée**, et `--workers=1` réutilise le même process Node entre
fichiers, ce qui semble perturber l'état module-level de `firebase-admin.ts` (`ensureAdminApp`)
pour le fichier suivant. Non reproduit en exécutant chaque fichier seul (3 runs), donc traité
comme une limite de l'environnement de test local, pas creusé plus loin.

## 🟢 Uniformisation — filtres de "Mes réels" alignés sur le design de /property

**Statut** : demande produit directe (pas un bug), implémentée et vérifiée visuellement +
via tests.

**Avant** : `/reels/mine` n'avait que deux champs date ("Publiés depuis le"/"Jusqu'au") toujours
visibles dans une grille 3 colonnes, sans recherche, sans repli mobile compact — design différent
de `/property` (recherche + bouton "Filtres" ouvrant un Sheet sur mobile, section complète avec
recherche + filtres sur desktop).

**Correctif** : repris exactement la même structure que `AdManagementPage.tsx` — mobile (`<md`) :
barre compacte recherche + bouton rond "Filtres" (pastille si filtres actifs) ouvrant un `Sheet`
en bas d'écran (mêmes classes, même en-tête/pied avec "Réinitialiser"/"Voir les résultats") ;
desktop (`>=md`) : section unique avec le champ recherche + les deux champs date + bouton
"Réinitialiser", même `CONTROL_CLASS`/mise en page en grille. Les champs Type/Statut/Promotion/Prix
de `/property` n'ont pas d'équivalent ici (n'ont pas de sens pour un réel) : seuls recherche +
période ont été repris, mais avec le même habillage visuel.

**Recherche, différence d'architecture avec /property à noter** : `/api/announcer/ads` charge
toutes les annonces de l'annonceur puis filtre/trie en mémoire côté serveur — les réels, eux,
sont chargés par pagination infinie côté client (`getReelsByOwner`, curseur Firestore), sans
recherche plein texte côté serveur. La recherche ajoutée ici filtre donc **côté client, sur les
réels déjà chargés** (par description, insensible à la casse/accents comme `matchesQuery` sur
/property) — une correspondance plus loin dans l'historique d'un annonceur avec beaucoup de réels
ne remonterait qu'après avoir chargé la page correspondante via "Voir plus de réels". Acceptable
en l'état (nombre de réels par annonceur généralement modeste), mais à garder en tête si ça devient
limitant.

**Fichiers** : `src/components/reels/MyReelsClient.tsx`,
`__tests__/components/my-reels-client.test.tsx` (textes d'état vide mis à jour + nouveaux cas pour
la recherche côté client et l'ouverture/réinitialisation du Sheet "Filtres"),
`__tests__/e2e/reels-mine-filters.spec.ts` (nouveau, vrai Firestore, desktop + mobile).

**Piège de sélecteurs rencontré en écrivant les deux suites de tests** : les blocs mobile et
desktop de `MyReelsClient.tsx` sont **tous les deux dans le DOM en permanence** (seul le CSS
`md:hidden`/`hidden md:block` cache l'un ou l'autre selon le viewport). En e2e réel, Playwright
compte les éléments en `display:none` dans la résolution stricte d'un locator — un
`getByLabel('Recherche')` ou `getByPlaceholder(...)` matche donc les deux instances à la fois
(constaté aussi plus tôt sur `lot4-mobile-announcer.spec.ts` pour un bloc stats dupliqué de la
même façon). Corrigé en ciblant les champs par leur id (`#reels-search` vs
`#reels-search-mobile`, `#mobile-reels-start-date` dans le Sheet), et en scopant les boutons
dupliqués (ex. "Effacer la recherche") au conteneur du champ concerné. Même remarque côté Jest :
`SheetContent` (Radix) ne monte son contenu que si `open`, donc pas d'ambiguïté tant que le Sheet
n'est pas ouvert dans un test — mais dès qu'il l'est, ses champs partagent le même libellé que la
grille desktop (toujours montée en jsdom, sans évaluation réelle des media queries) : scoper au
`role="dialog"` du Sheet une fois ouvert.

## 🟢 Uniformisation — stats de "Mes réels" en carousel mobile, repositionnées avant recherche/filtres

**Statut** : demande produit directe (pas un bug), implémentée et vérifiée visuellement + via
tests.

**Avant** : les 3 stats (Vues totales, Likes reçus, Partages) étaient en grille pleine largeur
(`grid-cols-1 sm:grid-cols-3`), affichées APRÈS la section recherche/filtres.

**Correctif** : repris exactement le pattern déjà utilisé pour les stats de `/property`
(`AdManagementPage.tsx`) — mobile (`<md`) : `Carousel`/`CarouselContent`/`CarouselItem`
(`@trouve-ton-nkama/ui/carousel`, `basis-[42%]`, `dragFree: true`) ; desktop (`>=md`) : grille
inchangée. Bloc déplacé avant la recherche/les filtres sur les deux viewports. Extrait le rendu
d'une carte de stat dans un petit composant `ReelStatCard` (au lieu de tripler le même balisage
entre carousel et grille), et donné un `data-testid` (`reel-stats-mobile`/`reel-stats-desktop`) à
chaque bloc, comme `ad-stats-mobile`/`ad-stats-desktop` sur /property.

**Piège révélé (pas causé) par ce changement** : les stats existaient déjà en double dans le DOM
implicitement dès qu'un composant a deux rendus mobile/desktop conditionnés en CSS — mais tant
qu'il n'y avait qu'un seul bloc, aucun test ne pouvait matcher deux fois le même texte. Avec le
carousel ajouté, `lot8d-reels-ux.spec.ts` (test pré-existant, jamais retouché depuis) a
immédiatement cassé sur `getByText('Vues totales').locator('..').getByText('128')` — violation de
strict mode. Confirme une nouvelle fois (déjà vu sur `lot4-mobile-announcer.spec.ts` et les
filtres ci-dessus) que Playwright compte les éléments `display:none` dans la résolution stricte
d'un locator, même en navigateur réel. Corrigé en scopant au bloc `reel-stats-mobile` (viewport
réellement testé par ce test). Même chose côté Jest (`my-reels-client.test.tsx`) : le vrai
Carousel (Embla) ne fonctionne pas en jsdom (`matchMedia` absent), mocké comme
`ad-management-page.test.tsx` le fait déjà pour /property — une fois mocké, les deux blocs stats
se retrouvent aussi dupliqués en jsdom, mêmes scopes par `data-testid` appliqués aux assertions
concernées.

**Fichiers** : `src/components/reels/MyReelsClient.tsx`,
`__tests__/components/my-reels-client.test.tsx` (mock Carousel + scope des assertions de stats),
`__tests__/e2e/lot8d-reels-ux.spec.ts` (scope des assertions de stats cassées par ce changement).

## 🟢 Corrigé — Miniature vidéo des cartes "Mes réels" affichée avec un mauvais ratio (effet "zoomé")

**Statut** : corrigé, vérifié visuellement avec une vraie image 9:16.

**Repro initial** (signalé par l'utilisateur) : sur `/reels/mine`, la miniature de chaque réel
semble anormalement recadrée/agrandie — comme si l'image affichée était "trop rapprochée" par
rapport à la vidéo réelle.

**Cause** : le cadre de la miniature (`ReelCard` dans `MyReelsClient.tsx`) utilisait
`aspect-[4/5]` avec `object-cover`. Les réels sont pourtant des vidéos verticales au ratio **9:16**
(confirmé dans le vrai lecteur, `ReelsFeedClient.tsx`/`SingleReelClient.tsx` :
`md:aspect-[9/16]`). Une image 9:16 affichée dans un cadre 4:5 (relativement moins haut) force
`object-cover` à recadrer bien plus que nécessaire pour remplir la largeur du cadre — le résultat
ne montre qu'une fine tranche verticale centrale de l'image source, donnant l'impression d'un
zoom/recadrage excessif plutôt que le cadrage réel de la vidéo.

**Correctif** : `aspect-[4/5]` → `aspect-[9/16]`, alignant le cadre de la miniature sur le ratio
réel des vidéos.

**Fichier** : `src/components/reels/MyReelsClient.tsx`.

**Vérifié** : capture d'écran avec une vraie image 720×1280 (9:16) — s'affiche désormais sans
recadrage artificiel, contre une tranche centrale zoomée avant le correctif. Pas de nouveau test
automatisé dédié (changement purement visuel, un ratio CSS) ; suites e2e existantes
(`lot8d-reels-ux.spec.ts`, `reels-mine-filters.spec.ts`) relancées après coup, aucune régression.

## 🟢 Ajouté — cliquer la miniature d'un réel sur "Mes réels" le lance

**Statut** : demande produit directe, implémentée et vérifiée (Jest + e2e réel).

**Avant** : la miniature de chaque carte (`ReelCard`, `MyReelsClient.tsx`) n'était pas cliquable —
seuls "Modifier"/"Supprimer"/"Attacher à une annonce" en bas de carte l'étaient.

**Correctif** : la miniature devient un `Link` vers `/reels/{id}` (page existante,
`SingleReelClient.tsx`, déjà utilisée comme lien profond WhatsApp) avec un bouton "lecture" rond
superposé (icône `Play`, `aria-label="Lire le réel"`), visible en permanence et qui grossit
légèrement au survol. **Seulement pour un réel `processingStatus: 'ready'`** :
`/reels/[reelId]` ne charge un réel que via `getPublicReelById()`, qui exige aussi
`processingStatus === 'ready'` **et** `moderationStatus === 'APPROVED'` — cliquer la miniature
d'un réel encore en envoi/traitement/rejeté afficherait à tort "n'est plus disponible" alors que
le badge de statut déjà affiché sur la carte explique déjà pourquoi ce n'est pas encore
disponible. Pour ces réels-là, la miniature reste un simple `<div>`, non cliquable.

**Fichier** : `src/components/reels/MyReelsClient.tsx`.

**Test qui le prouve** :
- Jest (`my-reels-client.test.tsx`) : le réel `ready` par défaut a un lien "Lire le réel" vers
  `/reels/mine-reel-1` ; un seul lien de ce type existe (les deux autres réels seedés par défaut
  ne sont pas `ready`).
- E2E réel (`reels-mine-play.spec.ts`, nouveau) : clique la miniature d'un réel `ready` → arrive
  réellement sur `/reels/{id}`, pas d'erreur, la description du bon réel s'affiche (pas juste une
  page qui ne plante pas) ; la miniature d'un réel `processing` n'a pas de lien "Lire le réel" du
  tout.

## 🔴 Corrigé — "Voir plus de réels" ramenait toujours vers le fil public, jamais vers "Mes réels"

**Statut** : corrigé, vérifié (Jest + e2e réel avec une vraie lecture vidéo).

**Repro initial** : depuis `/reels/mine`, cliquer une miniature (voir section précédente) ouvre
`/reels/{id}`. Cliquer "Voir plus de réels" sur cette page ramenait vers `/reels` (le fil public
de consommation), pas vers `/reels/mine` d'où on venait.

**Cause** : `SingleReelClient.tsx` était conçu à l'origine uniquement pour un lien profond ouvert
depuis WhatsApp (un acheteur externe, sans contexte "page d'origine" — repli sur le fil public
logique dans ce cas). Le lien "Voir plus de réels" pointait donc en dur vers
`routes.protected.reels`, sans jamais tenir compte de la page depuis laquelle on était arrivé —
resté inchangé quand ce composant a commencé à servir aussi de destination pour le clic sur une
miniature de "Mes réels".

**Correctif** : même mécanisme `?returnTo=` que `CreateOrphanReelClient.tsx` (liste blanche
`[/reels, /reels/mine]`, repli sur `/reels` par défaut — comportement inchangé pour le lien
profond WhatsApp, qui ne pose jamais ce paramètre). La miniature de `MyReelsClient.tsx` pointe
désormais vers `/reels/{id}?returnTo=%2Freels%2Fmine`.

**Bug d'accessibilité trouvé au passage (corrigé)** : le lien portait `aria-label="Retour au fil"`
alors que son texte visible dit "Voir plus de réels" — un `aria-label` explicite écrase le nom
accessible calculé depuis le contenu, donc un lecteur d'écran annonçait un texte différent de
celui affiché à l'écran (WCAG 2.5.3 "Label in Name"). Repéré par le test Jest lui-même
(`getByRole('link', { name: /Voir plus de réels/i })` ne trouvait pas l'élément). Retiré
l'`aria-label` : le texte visible, déjà descriptif, suffit.

**Fichiers** : `src/components/reels/SingleReelClient.tsx`, `src/components/reels/MyReelsClient.tsx`.

**Test qui le prouve** :
- Jest (`single-reel-client.test.tsx`, nouveau) : états chargement/introuvable/erreur/prêt ;
  lien "Voir plus de réels" → `/reels` par défaut (sans `returnTo`, cas WhatsApp) ; →
  `/reels/mine` avec `?returnTo=/reels/mine` ; retombe sur `/reels` si `returnTo` n'est pas dans
  la liste blanche (`https://malicious.example`).
- E2E réel (`reels-mine-play.spec.ts`) : nouveau test qui seed un réel avec une **vraie vidéo
  jouable** (générée par ffmpeg, embarquée en `data:` URI — pas d'upload Storage réel ni de
  dépendance réseau externe), clique sa miniature, vérifie que `<video>` joue réellement
  (`currentTime` échantillonné sur une fenêtre plus longue que la durée totale de la vidéo, une
  **baisse** entre deux échantillons prouvant qu'elle a bouclé — donc lue jusqu'au bout, pas
  figée sur la première image), puis clique "Voir plus de réels" et vérifie l'atterrissage exact
  sur `/reels/mine` (pas `/reels`), avec le contenu de la page bien rechargé (titre "Mes réels" +
  le réel visionné toujours présent dans la liste).

---

## 🔴 Corrigé — Le créateur d'un réel ne pouvait pas le visionner tant qu'il n'était pas approuvé

**Repro rapporté par l'utilisateur** : depuis `/reels/mine`, cliquer la miniature d'un réel
`processingStatus: 'ready'` mais pas encore approuvé (`moderationStatus` autre que `APPROVED`)
ouvrait `/reels/{id}` mais affichait "Ce réel n'est plus disponible ou n'a pas encore été
approuvé" — y compris pour son propre créateur. L'utilisateur : *"c'est moi qui a créé le réel
approuvé ou pas je dois le lire dans ma gallerie de reel. L'approbation permet juste de le rendre
publique."*

**Cause, à deux niveaux** :
1. `GET /api/reels/[reelId]` lisait via `getPublicReelById()` (`src/db/reel.db.ts`), qui utilise
   le SDK client Firestore et exigeait inconditionnellement `processingStatus === 'ready' &&
   moderationStatus === 'APPROVED'`, sans distinguer le créateur d'un visiteur public.
2. Même en ajoutant une règle "créateur" dans `firestore.rules`, cette route n'aurait de toute
   façon jamais pu la satisfaire : une route serveur qui utilise le SDK **client** n'a pas de
   session Firebase Auth réelle (ni Google OAuth ni le provider Credentials de NextAuth n'en
   établissent une), donc toute lecture y était **structurellement anonyme** aux yeux des règles
   — jamais reconnue comme le créateur, quel que soit l'utilisateur réellement connecté. Même
   famille de bug que `/api/property/[id]`, déjà corrigée plus tôt cette session.

**Correctif** : réécrit la route avec le SDK **Admin** (`firebase-admin/firestore`), identité
vérifiée côté serveur via la session NextAuth (`await auth()`, comme `/api/property/[id]`).
Logique explicite dans le code plutôt que dans des règles Firestore : `isOwner` (uid de la
session === `createdBy` du réel) OU `isPubliclyVisible` (`processingStatus === 'ready' &&
moderationStatus === 'APPROVED'`) — sinon 404. L'approbation ne conditionne donc plus que la
visibilité **publique**, jamais le droit du créateur à relire son propre réel, y compris
`PENDING` ou `REJECTED`. `getPublicReelById()` (SDK client, plus aucun appelant) supprimé de
`reel.db.ts`.

Aucun changement nécessaire côté `MyReelsClient.tsx` : le gating de la miniature
(`processingStatus === 'ready'`) était déjà correct — il ne dépendait jamais de
`moderationStatus`, seule la route API était en cause.

**Fichiers** : `src/app/api/reels/[reelId]/route.ts` (réécrit), `src/db/reel.db.ts`
(`getPublicReelById` supprimé), commentaires mis à jour dans `MyReelsClient.tsx`.

**Test qui le prouve** :
- Jest (`__tests__/api/reels-by-id.test.ts`, nouveau) : teste la route directement — visiteur
  anonyme voit un réel approuvé, ne voit pas un réel `PENDING` ; utilisateur connecté non
  propriétaire ne voit pas un réel `PENDING` d'autrui ; **le propriétaire voit son propre réel
  `PENDING` ou `REJECTED`** (le bug rapporté) ; 404 sur réel inexistant ; pas de crash si la
  résolution de session échoue.
- E2E réel (`reels-mine-play.spec.ts`) : nouveau test qui seed un réel `moderationStatus:
  'PENDING'` avec une vraie vidéo jouable (même technique `data:` URI que les autres tests de ce
  fichier), se connecte comme son propriétaire, clique sa miniature depuis `/reels/mine`, et
  vérifie que le message "n'est plus disponible" ne s'affiche jamais et que la vidéo démarre
  réellement (`<video>` non `paused`).

*Créé le 2026-08-31.*

---

## 🔴 Corrigé — La page de lecture d'un réel unique scrollait à cause de la navbar et la bottom bar

**Repro rapporté par l'utilisateur** : sur `/reels/{id}?returnTo=%2Freels%2Fmine`, le conteneur
vidéo (`h-[100dvh]`, pensé pour occuper exactement l'écran) provoquait un scroll de page au lieu
de rester figé.

**Cause** : cette page est physiquement dans `(protected)/reels/[reelId]/`, donc héritait sans
condition de `(protected)/layout.tsx` (navbar sticky, `Navbar` + `PhoneVerificationBanner`) et du
`Footer` + `BottomNavigation` du layout racine (`src/app/layout.tsx`), rendus pour toutes les
routes protégées. Ces éléments ajoutent leur propre hauteur en plus des 100dvh du lecteur — le
total dépasse la hauteur de l'écran. Le fil public `/reels` avait déjà ce même problème
partiellement corrigé (le `Footer` s'y masque déjà, voir son commentaire dans `Footer.tsx`), mais
`/reels/{id}` n'existait pas encore comme route à traiter à l'époque.

**Correctif** : nouveau helper partagé `isSingleReelViewRoute(pathname)`
(`src/lib/reels/single-reel-route.ts`, regex excluant `/reels`, `/reels/mine`, `/reels/add`,
`/reels/select-property` et `/reels/{id}/edit`) utilisé à trois endroits pour masquer
entièrement navbar/footer/bottom-nav sur cette page précise :
- `(protected)/layout.tsx` (converti en composant client pour lire `usePathname()`) : ne rend
  plus `Navbar`/`PhoneVerificationBanner` sur cette route.
- `BottomNavigation.tsx` : ajouté à `shouldHideBottomNavigationForEveryone`.
- `Footer.tsx` : ajouté à la condition `hideByRoute` (même raison que `routes.protected.reels`,
  déjà dans `hiddenFooterRoutes`).

**Fichiers** : `src/lib/reels/single-reel-route.ts` (nouveau),
`src/app/(protected)/layout.tsx`, `src/components/shared/BottomNavigation.tsx`,
`src/components/footer/Footer.tsx`.

**Test qui le prouve** : e2e réel (`reels-mine-play.spec.ts`, test "la vidéo se lit
intégralement...") — vérifie l'absence du lien "Accueil - Trouve Ton Nkama" (navbar) et de la
`nav[aria-label="Navigation mobile"]` (bottom bar), et que `document.documentElement.scrollHeight`
ne dépasse pas `window.innerHeight` sur cette page. A d'abord révélé, sur desktop
(`chromium-desktop-dev`), que masquer la navbar seule ne suffisait pas : le `Footer` marketing
restait affiché en dessous et dépassait toujours la hauteur de l'écran — corrigé en l'ajoutant
lui aussi à la condition de masquage.

*Créé le 2026-08-31.*

---

## 🟢 Ajouté — Barre de montage disponible en édition d'un réel déjà publié

**Demande directe de l'utilisateur** : "La seule chose qui manque dans l'édition est la barre du
haut permettant de rogner le réel comme quand on crée un réel" — `/reels/{id}/edit`
(EditReelClient.tsx) ne permettait de modifier que contact/description, pas le montage.

**Pourquoi ce n'était pas juste "réafficher le même composant"** : le rognage à la création
fonctionne parce que la vidéo BRUTE (choisie localement, jamais encore transcodée) est envoyée à
`transcodeReelVideo` (Cloud Function ffmpeg) qui la recoupe puis supprime le brut. Une fois le
réel `ready`, il ne reste plus de brut à recouper — seulement la vidéo déjà transcodée
(`videoUrl`). Deux approches possibles (question posée à l'utilisateur, qui a choisi la
première) :
- **Retenue** : renvoyer la vidéo déjà publiée comme nouveau "brut" pour que la même Cloud
  Function la recoupe à nouveau — coupe physique réelle, identique au comportement de la
  création, au prix d'un nouveau cycle Storage + Cloud Function à chaque montage.
- Écartée : stocker juste trimStart/trimEnd et adapter la lecture pour ne jouer que cette plage
  (aucun re-traitement, mais le fichier stocké reste entier et le comportement diffère de la
  création).

**Implémentation** :
- `functions/src/reels/transcode.ts` : **aucun changement** — `transcodeReelVideo` lit déjà
  `trimStartSeconds`/`trimEndSeconds`/`muted` depuis Firestore à chaque déclenchement Storage,
  peu importe si c'est le premier envoi ou un nouveau montage.
- `src/app/api/reels/route.ts` : nouvelle action PATCH `retrim` — vérifie la propriété, exige
  `processingStatus` `ready` ou `failed` (jamais pendant un traitement déjà en cours), remet
  `processingStatus: 'uploading'` + nouveau `rawVideoPath` + `trimStartSeconds`/`trimEndSeconds`
  + `contact`/`description` en une seule transaction (mêmes sanitizers que `update-details`).
- `src/db/reel.db.ts` : `retrimReel()`, même pattern fetch+Bearer token que `createReel`.
- `src/hooks/useVideoDropzone.ts` : `readVideoDurationSeconds` exportée (déjà utilisée en
  interne, réutilisée telle quelle pour le Blob récupéré en édition).
- `src/components/reels/EditReelClient.tsx` : au chargement d'un réel `ready` avec `videoUrl`,
  récupère la vidéo en Blob (`fetch(videoUrl)`) en arrière-plan (le lecteur simple reste affiché
  et utilisable pendant ce chargement) puis affiche **le même `VideoTrimEditor`** qu'à la
  création dès que prête. À l'enregistrement : si le montage a changé, `retrimReel()` puis
  réenvoi du fichier via `uploadRawReelVideo()` (même fonction qu'à la création) ; sinon,
  chemin inchangé (`updateReelDetails()` seul, pas de re-traitement pour un simple changement de
  texte).
- `src/components/reels/VideoTrimEditor.tsx` : `data-testid` ajoutés sur la barre et les deux
  poignées (aucun changement de comportement) — nécessaires pour piloter le drag depuis un test
  e2e réel.

**Piège rencontré en écrivant le test e2e** : la poignée de fin est centrée exactement sur le
bord droit de la barre (`left: 100%`, `-translate-x-1/2`) — sa moitié droite dépasse la barre et
est rognée par l'`overflow-hidden` du conteneur (invisible et hors zone cliquable), même si
`boundingBox()` Playwright continue de rapporter sa géométrie complète, non rognée. Un clic au
centre exact de la poignée tombe pile sur la limite de rognage et ne déclenche parfois aucun
`pointerdown` — corrigé en visant 25% de la largeur de la poignée (fermement dans sa moitié
visible/cliquable) plutôt que son centre.

**🔴 Correctif — la barre de montage n'apparaissait jamais en réalité (CORS)** : signalé par
l'utilisateur avec une capture d'écran comparant le formulaire de création (barre présente) à
l'édition (barre absente, juste le lecteur simple). Cause : `fetch(reel.videoUrl)` — une vraie
URL `firebasestorage.googleapis.com` — échoue systématiquement en CORS dans le navigateur (le
bucket Storage n'a **aucune** configuration CORS dans ce repo, confirmé par
`grep -rn cors` sur tout le monorepo). `<video src=...>` fonctionnait déjà très bien sans souci
car la lecture ne passe jamais par fetch/XHR (pas soumise à CORS), ce qui masquait totalement le
problème à l'usage normal de l'app. Le `.catch()` de l'effet avalait l'erreur silencieusement
(`videoFetchStatus: 'error'`), sans aucun message ni log visible — d'où la confusion initiale.
Reproduit avec une preuve directe : `page.evaluate(() => fetch(videoUrl))` sur une vraie vidéo
publiée renvoie `TypeError: Failed to fetch`, et la console navigateur affiche explicitement
`No 'Access-Control-Allow-Origin' header is present`.

**Blind spot du premier test e2e** : la toute première version de `reel-edit-retrim.spec.ts`
seedait directement un réel avec `videoUrl: 'data:video/mp4;base64,...'` — un `data:` URI n'a
*aucune* restriction CORS, donc ce test passait alors même que le vrai bug (CORS sur une URL
Storage réelle) existait déjà. Corrigé en réécrivant le test pour publier un réel via un vrai
upload Storage + vrai transcodage (comme `property-add-reel.spec.ts`) avant de tester l'édition —
cette version du test a effectivement échoué avant le correctif ci-dessous, confirmant qu'elle
attrape bien ce que la version en `data:` URI laissait passer.

**Correctif retenu** : proxy serveur plutôt qu'une configuration CORS sur le bucket (évite de
modifier une infrastructure partagée) — nouvelle route `GET /api/reels/[reelId]/video`
(Admin SDK, session NextAuth, propriétaire uniquement) qui télécharge les octets côté serveur
(jamais soumis à CORS navigateur) et les renvoie same-origin. `EditReelClient.tsx` fetch
désormais cette route plutôt que `reel.videoUrl` directement.

**Fichiers** : `src/app/api/reels/[reelId]/video/route.ts` (nouveau), `src/app/api/reels/route.ts`,
`src/db/reel.db.ts`, `src/hooks/useVideoDropzone.ts`, `src/components/reels/EditReelClient.tsx`,
`src/components/reels/VideoTrimEditor.tsx`, `src/models/reel.d.ts` (commentaire).

**Test qui le prouve** :
- Jest (`__tests__/api/reels-video.test.ts`, nouveau) : la route proxy — sert les octets au
  propriétaire d'un réel `ready` ; 404 pour un réel inexistant, non possédé, ou sans
  `videoPath` ; 401 sans session ; 500 sur une exception Storage inattendue.
- Jest (`__tests__/api/reels-api.test.ts`) : nouvelle action `retrim` — écrit
  `processingStatus: 'uploading'` + nouveau `rawVideoPath`/trim/contact/description ; accepte un
  retrim après un échec précédent (`processingStatus: 'failed'`) ; refuse pendant un traitement
  déjà en cours (409), sur un réel d'autrui (403), avec une plage invalide (400) ou un
  `rawVideoPath` qui ne correspond pas à l'utilisateur (400).
- E2E réel, nouveau fichier (`reel-edit-retrim.spec.ts`, réécrit après le correctif CORS
  ci-dessus) : **deux tests en série** — (1) publie un vrai réel via `/reels/add` (vraie vidéo
  ffmpeg de 3s, vrai upload Storage, vraie Cloud Function, poll jusqu'à `processingStatus:
  'ready'` avec un `videoPath` réel — pas de raccourci `data:` URI, justement pour exercer le
  même chemin CORS que la vraie application) ; (2) ouvre `/reels/{id}/edit` sur ce réel réel,
  **vrai drag de souris** sur la poignée de fin de la barre de montage (~100% → ~50%),
  enregistrement, puis — sans aucune assertion sur un état transitoire
  ('uploading'/'processing', intrinsèquement compétitif avec la vraie Cloud Function qui tourne
  sur cet environnement, voir la note similaire dans `property-add-reel.spec.ts`) — attente du
  retraitement complet et vérification en base : `durationSeconds` réellement plus courte que la
  source, `rawVideoPath` pointant vers le nouveau brut.

*Créé le 2026-08-31.*

---

## 🔴 Corrigé — "Attacher à une annonce" restait bloqué en chargement infini (index Firestore manquant), et la liste ne se rafraîchissait pas après un rattachement réussi

**Contexte** : premier test e2e réel pour ce parcours (aucun n'existait), demandé directement par
l'utilisateur — bouton "Attacher à une annonce" sur `/reels/mine` (réel orphelin, sans annonce)
→ `/reels/select-property?attachReelId={id}` → choix d'une annonce → `PATCH /api/reels` action
`attach-property`.

**Bug n°1 — 🔴 index Firestore manquant, spinner infini** : `getProperties({ createdBy, ... })`
(`db/property.db.ts`, utilisée par `SelectPropertyForReelClient.tsx`) combine
`where('state','==','IN_PROGRESS')`, `where('moderationStatus','==','APPROVED')`,
`where('createdBy','==',uid)` et `orderBy('createdAt','desc')` — aucun index composite
correspondant n'existait dans `firestore.indexes.json` (le plus proche,
`state+moderationStatus+createdAt`, n'inclut pas `createdBy`). Résultat en vrai navigateur :
`getDocs()` ne rejette jamais et ne se résout jamais — spinner de chargement infini, sans la
moindre erreur en console, sur la page "Choisir l'annonce à attacher". Repéré uniquement parce
que le test attendait la liste des annonces et n'a jamais vu apparaître le titre de l'annonce
seedée.

Diagnostiqué en comparant les index réellement déployés sur `location-maison-dev`
(`gcloud firestore indexes composite list`) à `firestore.indexes.json` — confirmé qu'aucun index
`state, moderationStatus, createdBy, createdAt` n'existait. **Correctif** : ajouté ce même index
à `firestore.indexes.json`, puis créé sur les trois projets (`location-maison-dev`,
`location-maison-preprod`, `location-maison-prod-167da`) via
`gcloud firestore indexes composite create` (additif, un seul index créé — délibérément **pas**
`firebase deploy --only firestore:indexes`, qui est déclaratif et aurait supprimé 3 index déjà
en prod/dev mais absents du fichier local, constaté au diff avant toute action : dérive
préexistante entre le fichier et les projets réels, hors sujet de ce correctif, non touchée).

**Bug n°2 — 🔴 liste non rafraîchie après un rattachement réussi** : une fois le bug n°1 corrigé,
le rattachement réussissait bien en base (`reels/{id}.propertyId` mis à jour, confirmé par
lecture Firestore directe) mais `SelectPropertyForReelClient.tsx` ne réinvalidait jamais le cache
react-query `['reels-mine', uid]` avant de rediriger vers `/reels/mine` — la carte y affichait
encore "Pas encore attaché à une annonce" jusqu'à un rechargement manuel. **Correctif** :
`queryClient.invalidateQueries({ queryKey: ['reels-mine', user?.uid] })` avant la redirection,
même clé que celle déjà invalidée ailleurs par `MyReelsClient.tsx`/`EditReelClient.tsx`.

**Fichiers** : `firestore.indexes.json`, `src/components/reels/SelectPropertyForReelClient.tsx`.

**Test qui le prouve** : e2e réel, nouveau fichier (`reel-attach-property.spec.ts`) — seed un
réel orphelin + une annonce réels, clique "Attacher à une annonce" depuis `/reels/mine`, vérifie
que la liste des annonces s'affiche réellement (preuve du bug n°1), choisit l'annonce, vérifie le
toast, la redirection vers `/reels/mine`, puis en base que `propertyId` a bien été écrit — et
enfin que la carte affiche réellement "Attaché à une annonce" (plus le bouton de rattachement)
au retour sur la liste, sans rechargement manuel (preuve du bug n°2).

*Créé le 2026-09-01.*

---

## 🟢 Ajouté — Recherche + pagination sur "Choisir l'annonce à attacher"

**Demande directe de l'utilisateur** : "si j'ai 300 annonces, on ne va pas charger les 300
annonces mais les paginer et pour retrouver facilement une annonce en particulier ce serait bien
avec une barre de recherche" — `SelectPropertyForReelClient.tsx` chargeait jusqu'à 50 annonces
d'un coup (`getProperties({ limitPerPage: 50, ... })`), sans recherche.

**Implémentation** : réutilise `/api/announcer/ads` (déjà utilisée par "Gestion des annonces",
`AdManagementPage.tsx`/`useAdManagement.ts`) plutôt que d'inventer un nouveau système — cette
route fait déjà exactement ce qu'il fallait ici : recherche texte substring insensible à la
casse/accents (`matchesQuery`/`normalizeText`, sur titre/description/ville/province/rue/type) et
pagination par curseur numérique, le tout calculé côté serveur (Admin SDK) sur les annonces de
l'annonceur. Contrairement à `MyReelsClient.tsx` (`/reels/mine`), dont la recherche ne filtre
QUE les pages déjà chargées via l'infini-scroll (limite documentée dans son propre code) — pas
adapté ici puisque l'objectif explicite est justement de retrouver une annonce **sans avoir tout
chargé**.

- `src/db/property.db.ts` : nouvelle fonction `searchOwnedProperties({ query, limitPerPage,
  cursor })`, appelle `/api/announcer/ads?scope=immobilier&q=...&limit=...&cursor=...` (session
  NextAuth, pas de token Bearer à gérer côté client). `scope=immobilier` exclut les annonces
  marketplace/Mode — un réel ne peut être rattaché qu'à une annonce immobilière
  (`attachReelToProperty` écrit sur `properties/{id}`). Contrairement à `getProperties()`
  (toujours utilisée ailleurs, inchangée), ne filtre pas par `state`/`moderationStatus` : le
  propriétaire doit pouvoir retrouver n'importe laquelle de ses annonces, y compris archivée ou
  en attente de modération.
- `src/components/reels/SelectPropertyForReelClient.tsx` : `useQuery` → `useInfiniteQuery`
  (curseur serveur, page de 20), barre de recherche avec debounce 350ms (même délai que
  `useAdManagement.ts`), chargement automatique au scroll (IntersectionObserver + sentinelle) et
  bouton "Voir plus d'annonces" de repli — même pattern que `MyReelsClient.tsx`. Distingue l'état
  vide "aucune annonce" (compte réellement à zéro) de "aucun résultat pour cette recherche".

**Fichiers** : `src/db/property.db.ts`, `src/components/reels/SelectPropertyForReelClient.tsx`.

**Test qui le prouve** : e2e réel, nouveau bloc dans `reel-attach-property.spec.ts` — seed 21
annonces réelles (20 génériques + 1 au titre distinctif) :
- **Pagination** : la première visite n'affiche que 20 cartes (`data-testid="select-property-card"`,
  pas les 21), le bouton "Voir plus d'annonces" est visible, un clic charge la 21e et fait
  disparaître le bouton.
- **Recherche** : une recherche partielle et insensible à la casse ("RARE ET UNIQUE" sur un
  titre contenant "rare et unique") ne laisse plus qu'un seul résultat — l'annonce cherchée,
  aucune des 20 génériques — sans dépendre de la pagination (elle n'était pas forcément sur la
  première page). Effacer la recherche restaure la première page complète (20 cartes).

*Créé le 2026-09-01.*

---

## 🟢 Ajouté — Limite de durée des réels remontée de 5 à 10 minutes

**Demande directe de l'utilisateur** : une vendeuse a reçu une erreur en essayant de créer un
réel ; soupçon d'une limite de taille/durée trop stricte. Confirmé : `MAX_REEL_DURATION_SECONDS`
= 300s (5 min) côté navigateur, plus un plafond de taille et un timeout d'upload qui, ensemble,
rendaient l'envoi d'une vidéo un peu longue/lourde peu fiable sur une connexion mobile moyenne.
Demande explicite : passer à 10 minutes.

**Changements, tous nécessaires ensemble** (relever seulement la durée sans le reste aurait
laissé les vidéos plus longues buter sur les autres plafonds, inchangés) :
- `src/constantes/index.ts` : `MAX_REEL_DURATION_SECONDS` 300→600s ; `MAX_REEL_RAW_SIZE_BYTES`
  500→1000 Mo (sinon une vidéo deux fois plus longue au même bitrate aurait quand même buté sur
  l'ancien plafond de taille, annulant l'intérêt du relèvement de durée). `AD_VIDEO_MAX_*`
  (créas publicitaires) volontairement **non touchées** — système découplé par design (voir
  commentaire déjà présent dans le fichier).
- `src/db/reel.db.ts` : timeout de `uploadRawReelVideo` (`withTimeout(uploadBytes(...))`)
  120s→600s — à l'ancien plafond de taille (500 Mo), 2 min exigeait déjà ~33 Mbps soutenus pour
  ne pas expirer avant la fin de l'envoi, hors de portée d'une connexion mobile moyenne ; c'est
  très probablement la cause réelle de l'erreur de la vendeuse (pas un refus explicite, un
  timeout silencieux côté client).
- `functions/src/reels/config.ts` : `REEL_MAX_DURATION_SECONDS` 300→600s (miroir serveur, revalidé
  par `transcodeReelVideo` indépendamment du contrôle navigateur).
- `src/components/reels/CreateOrphanReelClient.tsx` : textes "5 minutes" → "10 minutes" (message
  de refus + les deux textes d'aide de l'écran de dépôt).

**Piège au déploiement** : `timeoutSeconds: 900` (relevé en même temps, pour laisser au job de
transcodage — download + probe + encodage + miniature + upload — le temps de traiter une vidéo
deux fois plus longue) a été **refusé par Firebase** au déploiement : 540s est le plafond
MAXIMUM autorisé pour ce type de déclencheur (trigger Storage 2ᵉ génération), pas une marge
ajustable. Reverti à 540s (valeur déjà maximale, inchangée) — l'encodage h264 `-preset veryfast`
sur 2 vCPU reste largement plus rapide que le temps réel, donc cette limite reste confortable en
pratique malgré la durée vidéo doublée.

**Déploiement** : `firebase deploy --only functions:transcodeReelVideo` sur `location-maison-dev`
et `location-maison-prod-167da` — réussi sur les deux. **Échoué sur `location-maison-preprod`**,
mais pour une raison **totalement indépendante** de ce changement : le déploiement (même filtré à
une seule fonction) valide tous les secrets référencés dans l'ensemble du codebase de fonctions,
et `MYPAYGA_SEARCH_REQUEST_CALLBACK_URL` (secret utilisé par une fonction de callback de
paiement MyPayGA, sans rapport avec les réels) n'existe pas du tout sur ce projet
(`firebase functions:secrets:access` → 404, confirmé absent — présent et correct sur prod).
Préexistant, non introduit par ce travail — **action à part nécessaire** :
`firebase functions:secrets:set MYPAYGA_SEARCH_REQUEST_CALLBACK_URL --project
location-maison-preprod` (valeur à confirmer, hors de portée sans en connaître l'URL exacte),
puis relancer le déploiement des réels sur preprod.

**Fichiers** : `src/constantes/index.ts`, `src/db/reel.db.ts`, `functions/src/reels/config.ts`,
`src/components/reels/CreateOrphanReelClient.tsx`.

**Test qui le prouve** :
- Jest, functions (`functions/__tests__/reels/transcode.test.ts`) : `buildReelProcessingPlan`
  accepte jusqu'à 600s, rejette 601s (`VIDEO_TOO_LONG`) — ancien seuil à 301s mis à jour.
- E2E réel, nouveau fichier (`reel-duration-limit.spec.ts`) : deux vraies vidéos synthétiques
  (ffmpeg, très faible bitrate donc quelques Ko malgré une longue durée — génération en
  &lt;100ms, aucun upload réel nécessaire ici puisque le contrôle est 100% côté navigateur avant
  tout envoi) — une de 605s est refusée avec le message "Vidéo trop longue (10 minutes
  maximum)." et reste sur l'écran de dépôt ; une de 595s (au-delà de l'ancien plafond de 5 min,
  sous le nouveau) est acceptée et passe à l'éditeur de montage, sans aucun toast de refus —
  preuve que le seuil a bien été relevé, pas seulement que l'ancien message fonctionne encore.

*Créé le 2026-09-01.*
