# Audit coûts Algolia (2026-09)

**Demande directe de l'utilisateur** : « depuis un temps algolia a des factures assez salées
alors qu'on gagne même pas encore 100f avec trouve ton nkama... Algolia offre 10 mille requêtes
gratuites par mois... je veux qu'on essaye de voir un système qui gère mieux les requêtes
Algolia ». Deuxième volet : existe-t-il une bibliothèque gratuite équivalente ?

## 🔴 Corrigé — Une requête Algolia partait sur CHAQUE page du site, y compris celles sans aucune recherche

**Diagnostic, pas une supposition** : tracé le trafic réseau réel (Playwright) vers
`*.algolia.net`/`*.algolianet.com` sur plusieurs pages qui n'ont structurellement aucun rapport
avec la recherche.

**Avant correctif** :

| Page | Appels Algolia |
|---|---|
| `/` (accueil) | 6 (dont 3 requêtes logiques distinctes) |
| `/privacy-policy` | 2 |
| `/terms-of-use` | 3 |
| `/blog` | 2 |
| `/demandes-recherche` | 1 |
| `/publicite` | 2 |

**Cause** : `AlgoliaRefinementsContext.tsx` (`AlgoliaRefinementsProvider`) était monté
globalement dans `src/providers/providers.tsx`, donc actif sur **toutes** les pages de
l'app (publiques ET protégées, via `RootLayout` → `Providers` → `{children}`). Il appelait sans
condition 6 connecteurs InstantSearch actifs : `useMenu({attribute:"city"})`,
`useMenu({attribute:"street"})`, `useRefinementList({attribute:"typeProperty"})`,
`useRefinementList({attribute:"tags"})`, `useSearchBox()`, `useHits()` — chacun de ces
connecteurs déclenche une vraie requête Algolia dès qu'il est monté.

**Le pire** : recherche globale dans tout le code (`grep -rln "useAlgoliaRefinements"`) — **aucun
composant n'utilisait ce contexte**. Zéro consommateur. Une facture pour zéro fonctionnalité,
sur chaque page, depuis son introduction (confirmé par `git log --follow` : présent dès les
premiers refactors de ce module).

**Correctif** : `AlgoliaRefinementsProvider` retiré de `providers.tsx`, fichier
`AlgoliaRefinementsContext.tsx` supprimé (code mort).

**Après correctif** (même trace, mêmes pages) :

| Page | Appels Algolia |
|---|---|
| `/` (accueil) | 4 (composant `HomePage.tsx` — `useRefinementList`, réellement consommé par le carrousel de catégories, légitime) |
| `/privacy-policy` | **0** |
| `/terms-of-use` | **0** |
| `/blog` | **0** |
| `/demandes-recherche` | **0** |
| `/publicite` | **0** |
| `/annonce/[id]` (fiche annonce — probablement la page la plus visitée du site) | **0** |
| `/signin` | **0** |

**Vérifié** : `tsc --noEmit` propre, suite Jest complète **1571/1571** (aucune régression — cohérent
avec zéro consommateur réel).

**Impact attendu** : la quasi-totalité du trafic d'un site immobilier va vers les fiches
annonces, les pages SEO et le contenu (blog, accueil) — pas vers `/search` elle-même. Ce
correctif élimine une requête facturée sur CETTE majorité du trafic, sans aucun changement
fonctionnel visible.

**Fichiers** : `src/providers/providers.tsx`, `src/providers/AlgoliaRefinementsContext.tsx`
(supprimé).

---

## Composition du volume restant (légitime, sur `/search` uniquement)

Un chargement de `/search` déclenche **6 requêtes POST** (en dev, `reactStrictMode: true` double
certains effets — le chiffre réel en production est probablement plus proche de 3 requêtes
logiques distinctes) :
- facettes `typeProperty` (compteurs par type de bien)
- facettes `province`
- facettes `tags`
- les résultats (`hits`) eux-mêmes

**Bonne nouvelle vérifiée en creusant** : la recherche texte de `/search` (les pages réellement
montées, `SearchDesktopPage.tsx`/`SearchMobilePage.tsx`) ne déclenche **pas** de requête à
chaque frappe clavier — le texte de recherche vient d'un paramètre d'URL (`?query=`), lu une
fois via `FilterProviders.tsx`. Le seul composant qui utilise `useSearchBox` (recherche "live")
est `SearchPage.tsx`, qui n'est monté nulle part dans le routing réel (code mort, non touché ici
— hors périmètre de cette demande).

**Pages SEO statiques** (`/immobilier/[transaction]/[type]/[city]`) : 7 villes × 5 types × 2
transactions + 10 pages globales = **80 pages**, chacune interroge Algolia une fois côté serveur
via `generateStaticParams` (au build) puis au maximum une fois par heure par page grâce à
`revalidate = 3600` (ISR) — volume déjà borné, pas une priorité.

## ✅ Fait — Cache serveur devant Algolia, sans Redis (2026-09-04)

**Demande directe** : « Redis aussi nous donnait des factures salées, on l'a suspendu
temporairement... pour le cache serveur faut vraiment qu'on le mette en place... sans Redis
malheureusement pour Algolia ». Implémente la recommandation n°1 ci-dessus, mais en mémoire
process plutôt que Redis (indisponible) ou Firestore (lectures/écritures facturées, mauvais
choix pour un cache aussi sollicité).

**Découverte en creusant** : deux points d'appel Algolia distincts existaient, pas un seul —

1. `AlgoliaContext.tsx` → `<InstantSearch searchClient>`, consommé par les widgets
   InstantSearch (`useRefinementList`, `useInfiniteHits`...).
2. `src/lib/algolia.ts` → client Algolia appelé **directement**, hors InstantSearch, par
   `useAlgoliaFacetOptions.ts` et `useAlgoliaLocationOptions.ts` (compteurs de facettes
   `typeProperty`/`tags`/attributs Mode, et cascades Province → Ville → Rue). Ces hooks ont
   déjà un cache React Query côté navigateur (`staleTime: 5 min`), mais **par onglet** : chaque
   nouveau visiteur relance une requête Algolia facturée pour un compteur identique.

**Architecture retenue** : un seul proxy serveur (`POST /api/algolia/search`) devant les deux
points d'appel, avec un cache mémoire process (`MemoryCacheStore`, nouveau, zéro coût, zéro
infra) partagé entre tous les visiteurs pendant sa fenêtre de TTL :

- `src/lib/algolia-cached-search-client.ts` : même interface `.search()` que le client Algolia
  officiel (supporte les deux conventions d'appel `search(array)` et `search({requests})|`),
  mais appelle `/api/algolia/search` au lieu d'Algolia directement.
- `src/lib/algolia.ts` et `AlgoliaContext.tsx` pointent désormais tous les deux vers ce même
  client — un seul point de cache pour tout le trafic Algolia côté navigateur.
- `src/app/api/algolia/search/route.ts` : reçoit un lot de requêtes, sert celles déjà en cache,
  ne renvoie à Algolia que les requêtes manquantes (un seul appel groupé), met les nouvelles en
  cache. Jamais plus de 20 requêtes par lot (garde-fou anti-abus).
- `src/lib/cache/memory-cache-store.ts` : nouveau backend `CacheStore` (même interface que
  `RedisCacheStore`/`FirestoreCacheStore`), ajouté au sélecteur `CACHE_BACKEND` existant
  (`get-cache-store.ts`) pour être réutilisable ailleurs, mais utilisé ici via une instance
  **dédiée** et toujours mémoire, indépendante du choix de backend général — un cache à cette
  fréquence doit rester gratuit quel que soit l'état de Redis/Firestore par ailleurs.
- TTL différencié : 120s pour les requêtes "facettes uniquement" (`hitsPerPage: 0` — comptages,
  tolèrent largement ce délai), 30s pour les requêtes avec de vraies annonces (fraîcheur après
  publication/modération). Réglable via `ALGOLIA_CACHE_FACETS_TTL_SECONDS` /
  `ALGOLIA_CACHE_HITS_TTL_SECONDS`.

**Limite assumée** : un cache mémoire process n'est pas partagé entre plusieurs instances
serveur et se vide à chaque redémarrage/déploiement — contrairement à Redis. Sur le volume
actuel (pré-revenu), c'est un compromis délibéré : zéro coût, zéro latence réseau, et un
partage déjà réel entre visiteurs simultanés d'une même instance. À reconsidérer seulement si
le trafic justifie plusieurs instances serveur en parallèle.

**Vérifié** :
- `tsc --noEmit` propre.
- Suite Jest complète : **1594/1594** (24 nouveaux tests : `MemoryCacheStore`, canonicalisation
  de clé de cache, logique de résolution par lot avec cache partiel, client proxy, route API).
- Trace réseau live (Playwright, dev) sur `/`, `/search`, `/publicite` : **0 appel direct
  navigateur → `*.algolia.net` sur les trois pages** (avant : chaque page en faisait un
  directement). Tout le trafic passe désormais par `/api/algolia/search`.

**Fichiers** : `src/lib/cache/memory-cache-store.ts` (+ enregistré dans `get-cache-store.ts`,
`index.ts`), `src/lib/algolia-search-proxy.ts`, `src/lib/algolia-cached-search-client.ts`,
`src/app/api/algolia/search/route.ts`, `src/lib/algolia.ts`, `src/providers/AlgoliaContext.tsx`.

## Recommandations non implémentées restantes (décision produit à prendre)

1. **Réduire le nombre de facettes demandées par requête** sur `/search` si toutes ne sont pas
   affichées immédiatement (ex. charger les facettes secondaires à la demande, pas au premier
   rendu).
2. Retirer `SearchPage.tsx` du dépôt (code mort confirmé, utilise `useSearchBox` — aucun risque
   de coût aujourd'hui puisqu'il n'est jamais monté, mais clarifierait le code pour la suite).

## Piste Meilisearch — en complément d'Algolia, pas en remplacement

**Précision explicite de l'utilisateur** : « l'objectif n'est pas de retirer Algolia mais de
l'épauler avec une bibliothèque comme Meilisearch ». Donc pas une migration — un partage de
charge : Meilisearch absorbe le trafic qui n'a pas besoin du moteur de pertinence d'Algolia,
Algolia reste sur ce qui en a vraiment besoin.

### Répartition proposée

| Trafic | Aujourd'hui | Proposition |
|---|---|---|
| Recherche texte libre + tri par pertinence (`/search`, résultats réels) | Algolia | **Reste sur Algolia** — c'est là que son moteur de pertinence/tolérance aux fautes a une vraie valeur |
| Compteurs de facettes (`useAlgoliaFacetOptions.ts` : types, tags, attributs Mode) | Algolia (via le nouveau proxy caché) | **Bascule vers Meilisearch** — un simple comptage par valeur distincte, aucun besoin de pertinence |
| Cascades de localisation (`useAlgoliaLocationOptions.ts` : Province → Ville → Rue) | Algolia (via le nouveau proxy caché) | **Bascule vers Meilisearch** — idem, énumération de valeurs distinctes |
| Widgets `useRefinementList` du carrousel accueil | Algolia (via le nouveau proxy caché) | **Bascule vers Meilisearch** — même raisonnement |

Concrètement : tout ce qui passe aujourd'hui par `src/lib/algolia.ts` (les deux hooks de
facettes) migrerait vers un client Meilisearch, pendant qu'`AlgoliaContext.tsx`/`/search`
resteraient sur Algolia. C'est une frontière nette et déjà visible dans le code actuel (deux
points d'appel distincts, justement séparés lors du travail de cache ci-dessus) — donc un
changement localisé, pas une réécriture du moteur de recherche.

**Effet sur la facture Algolia** : les hooks de facettes sont probablement la plus grosse part
du volume restant après la mise en cache (appelés à chaque ouverture de filtre, chaque
sélection Province/Ville, chaque formulaire Mode) — les faire sortir d'Algolia réduirait son
volume facturé bien plus que le cache seul, sans toucher à la recherche principale.

### Ce qu'il manque pour livrer ça, et pourquoi ce n'est pas fait dans ce même passage

Contrairement à Algolia (synchronisé automatiquement depuis Firestore par l'extension Firebase
officielle `algolia/firestore-algolia-search`, zéro code côté ce dépôt), **Meilisearch n'a pas
d'extension Firebase équivalente maintenue par Meilisearch** — il faudrait écrire une Cloud
Function dédiée (déclenchée sur les mêmes écritures Firestore que l'extension Algolia) qui
pousse les documents vers l'API REST de Meilisearch. Faisable et pas complexe (Meilisearch a un
SDK Node officiel), mais :

1. **Ça suppose une instance Meilisearch qui tourne déjà** (auto-hébergée : ~5$/mois sur un
   petit VPS type Fly.io/Railway/Hetzner, ou gratuite sur le free tier Oracle Cloud) — un choix
   d'hébergement et de budget qui vous revient, pas quelque chose que je peux provisionner
   depuis ce dépôt.
2. Une fois l'instance choisie, le travail restant est : (a) la Cloud Function d'indexation
   (miroir de ce que fait l'extension Algolia aujourd'hui), (b) un client Meilisearch côté
   front (`meilisearch` npm, adaptateur officiel `@meilisearch/instant-meilisearch` si on
   voulait aussi le brancher sur `react-instantsearch` plus tard), (c) rebrancher les deux
   hooks de facettes dessus. Effort raisonnable une fois l'hébergement en place — mais écrire
   la Cloud Function maintenant, sans instance à laquelle la tester, produirait du code invérifié.

**Prochaine étape concrète** : dites-moi où héberger Meilisearch (ou si vous avez déjà une
préférence/un compte quelque part) et je code l'indexation + le rebranchement des deux hooks
dessus.

*Mis à jour le 2026-09-04.*
