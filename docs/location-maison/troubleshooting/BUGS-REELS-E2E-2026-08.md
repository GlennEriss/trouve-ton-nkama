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

*Créé le 2026-08-30, mis à jour le 2026-08-31.*
