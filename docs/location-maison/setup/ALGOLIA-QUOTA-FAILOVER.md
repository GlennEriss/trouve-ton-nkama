# Garde-fou de quota Algolia + bascule automatique vers Meilisearch

**Objectif chiffré, fixé par l'utilisateur** : **0 FCFA de dépassement Algolia** sur chaque
période de facturation, qui va **du 9 d'un mois au 8 du mois suivant**. Aujourd'hui la dernière
facture (période 09/08/2026 → 08/09/2026, plan **Grow**, app `X9XCHZ509R` / index
`location-maison_property-index`) montre **13 000 requêtes de recherche au-delà des 10 000
incluses**, facturées 13 × 0,50 $ = **6,50 $ ≈ 5 000 FCFA**. Il faut ramener chaque période
sous 10 000 requêtes facturables, et garantir que même un pic ne fera jamais repasser en
dépassement.

Ce document est l'**analyse complète + l'architecture**. Il
complète, et ne remplace pas :
- [ALGOLIA-COST-AUDIT-2026-09.md](../troubleshooting/ALGOLIA-COST-AUDIT-2026-09.md) — diagnostic
  et correctifs déjà livrés (fuite de requêtes globale supprimée, cache serveur mémoire devant
  Algolia).
- [MEILISEARCH_SETUP.md](./MEILISEARCH_SETUP.md) — plan de mise en place de Meilisearch en
  complément (répartition du trafic, hébergement, indexation).

## État d'avancement

| Phase | État | Détail |
|---|---|---|
| **A — Observabilité** | ✅ **Livré (2026-09-09)** | Compteur Firestore `system_config/algolia-quota` en mode observation, instrumentation du proxy `/api/algolia/search` + des pages SEO, Cloud Function `monitorAlgoliaSearchQuota` (reset de période + réconciliation API Usage + alerte log/e-mail à 80 %), carte admin `/admin/search-quota`. Aucune bascule : `SEARCH_QUOTA_ENFORCE` non activé. |
| **B — Meilisearch permanent (facettes)** | ⏳ En attente du provisioning Meilisearch (§13.1) | — |
| **C — Failover armé** | ⏳ Après B | Adaptateur Algolia↔Meilisearch + `SEARCH_QUOTA_ENFORCE=true` |

**Fichiers livrés en Phase A** :
`src/lib/search/algolia-billing-period.ts`, `src/lib/search/algolia-quota-store.ts`,
`src/app/api/algolia/search/route.ts` (instrumenté), `src/lib/seo/algolia-listings.ts`
(instrumenté), `src/app/api/admin/search-quota/route.ts`,
`src/components/admin/SearchQuotaCard.tsx`,
`src/app/(protected)/admin/search-quota/page.tsx`,
`functions/src/search/algolia-billing-period.ts`,
`functions/src/search/algolia-quota-monitor.ts` (+ export dans `functions/src/index.ts`).
Tests : `__tests__/lib/algolia-billing-period.test.ts`,
`__tests__/lib/algolia-quota-store.test.ts`,
`functions/__tests__/algolia-billing-period.test.ts`.

---

## 1. Rappel de l'état des lieux (ce qui est déjà fait)

| Élément | État | Fichier(s) |
|---|---|---|
| Provider Algolia monté globalement → 1 requête sur **chaque** page (code mort, 0 consommateur) | **Supprimé** | `src/providers/providers.tsx` |
| Tout le trafic Algolia navigateur passe par un proxy serveur unique | **En place** | `src/app/api/algolia/search/route.ts`, `src/lib/algolia-cached-search-client.ts`, `src/lib/algolia.ts`, `src/providers/AlgoliaContext.tsx` |
| Cache serveur mémoire process devant Algolia (TTL 120 s facettes / 30 s hits), mutualisé entre visiteurs | **En place** | `src/lib/algolia-search-proxy.ts`, `src/lib/cache/memory-cache-store.ts` |
| `DO_FULL_INDEXING` de l'extension Algolia | **`false`** (plus de réindexation totale à chaque déploiement) | `apps/location-maison/extensions/firestore-algolia-search.env` |
| Extension Firebase `algolia/firestore-algolia-search` indexe le **document complet** (≈ 40 champs, voir `FIELDS=`) | **En place** | idem |
| Meilisearch | **Rien** — pas d'instance, pas d'indexeur, pas de client | — |

**Ce que le proxy ne voit pas encore** (donc non compté, non basculable) :
`src/lib/seo/algolia-listings.ts` → `searchLandingProperties()` appelle
`https://X9XCHZ509R-dsn.algolia.net/1/indexes/.../query` **en direct** (`fetch`), pour les
~80 pages SEO `/immobilier/[transaction]/[type]/[city]`, avec ISR `revalidate: 900` (15 min).
C'est un volume borné mais réel qui échappe au compteur.

---

## 2. Comprendre la facturation Algolia Grow

- Le plan **Grow** inclut **10 000 requêtes de recherche par période de facturation**, puis
  **0,50 $ par tranche de 1 000** requêtes supplémentaires (confirmé par la facture :
  « Additional search requests — Quantity is bundle size of 1000 search requests »).
- Une **requête de recherche** = un objet dans le tableau `requests` envoyé à Algolia. Un
  chargement de `/search` en envoie aujourd'hui ~3 (facettes `typeProperty`, facettes
  `province`, `tags` + `hits`) — **chacune compte**. C'est exactement `missIndexes.length` dans
  `resolveAlgoliaSearchRequests` : le nombre de requêtes réellement transmises à Algolia après
  déduplication par le cache. **Les hits de cache ne coûtent rien et ne doivent pas être
  comptés.**
- La période **ne suit pas le mois calendaire** : elle est ancrée au **jour d'anniversaire de
  l'abonnement = le 9**. Période = `[9 à 00:00 UTC → 9 du mois suivant à 00:00 UTC[`.
  ⚠️ **À confirmer dans le dashboard Algolia** : heure exacte et fuseau de la remise à zéro
  (on suppose 00:00 UTC le 9). Le paramètre `ALGOLIA_BILLING_ANCHOR_DAY` rend ça ajustable si
  le plan change.
- **Comportement au dépassement sur Grow** : Algolia **ne coupe pas** le service, il
  **facture** la tranche supplémentaire. Donc rien ne nous protège automatiquement — le
  garde-fou décrit ici est la seule barrière.

### Clé de période

```
periodKey(now):
  d = now en UTC
  si d.day >= ANCHOR_DAY (9): retourne `${d.year}-${d.month}`      // ex. 2026-09
  sinon:                       retourne le mois précédent           // ex. 2026-08
```

Le 20 septembre → `2026-09`. Le 3 septembre → `2026-08`. La période « septembre » couvre
09/09 → 08/10.

---

## 3. Objectif de trafic : d'où viennent les 23 000 requêtes, et comment descendre sous 10 000

Trois leviers, dans l'ordre d'impact :

### Levier 1 — Sortir les facettes d'Algolia (permanent, pas conditionnel)

C'est la reprise du §1 de [MEILISEARCH_SETUP.md](./MEILISEARCH_SETUP.md). Les hooks
`src/hooks/useAlgoliaFacetOptions.ts` (`typeProperty`, `tags`, `attributes.<clé>` Mode) et
`src/hooks/useAlgoliaLocationOptions.ts` (cascade Province → Ville → Rue) n'utilisent
**aucune fonctionnalité propre à Algolia** — juste `facets` + `hitsPerPage: 0`. Ils sont
appelés à chaque ouverture de filtre, chaque sélection de ville, chaque formulaire de
publication Mode → **probablement la plus grosse part des 23 000**. Ils basculent sur
Meilisearch **en permanence**, quota Algolia ou pas.

### Levier 2 — Compter et cacher les pages SEO

`searchLandingProperties()` doit passer par le même proxy serveur que le reste (voir §6),
pour être (a) compté, (b) basculable, (c) mutualisé par le cache. L'ISR `revalidate` reste :
le volume SEO redevient marginal.

### Levier 3 — Le garde-fou (ce document)

Ce qui reste sur Algolia après les leviers 1–2 = la **recherche texte + pertinence de
`/search`** et le **carrousel d'accueil**. Si, malgré tout, une période approche des 10 000,
le garde-fou bascule **aussi** ce trafic vers Meilisearch jusqu'au 9 suivant.

> **Estimation** : leviers 1+2 devraient à eux seuls ramener sous 10 000. Le garde-fou est la
> ceinture en plus des bretelles — il garantit le « 0 FCFA » même si l'estimation est fausse
> ou si le trafic double.

---

## 4. Architecture du garde-fou

### 4.1 Vue d'ensemble

```
                        ┌─────────────────────────────────────────┐
  Navigateur            │            Vercel (Next.js)             │
  - InstantSearch  ───► │  /api/search  (ex-/api/algolia/search)  │
  - hooks facettes      │                                         │
  Serveur SSR/ISR  ───► │  ┌───────────────────────────────────┐  │
  - pages SEO           │  │ search-gateway                     │  │
                        │  │  1. cache mémoire (dédup requêtes) │  │
                        │  │  2. getSearchMode() ──────────────┐│  │
                        │  │  3a. ALGOLIA  → client lite       ││  │
                        │  │  3b. MEILI    → adapter + client  ││  │
                        │  │  4. incrémente le compteur (3a)   ││  │
                        │  └──────────────────────────────────┼┘  │
                        └─────────────────────────────────────┼───┘
                                                              │
                 ┌────────────────────────────────────────────┼───────────────┐
                 ▼                                            ▼               ▼
        Firestore `system_config/algolia-quota`      Algolia (Grow)   Meilisearch (VM GCP e2-micro)
        { periodKey, count, mode, switchedAt, ... }                   index: location-maison_property
                 ▲                                                            ▲
                 │ reset + réconciliation + alertes                           │ onDocumentWritten(properties/{id})
        Cloud Function onSchedule (quotidien 00:15 UTC)          Cloud Function meilisearch-indexer
```

### 4.2 Le compteur — Firestore, jamais la mémoire

Le site tourne sur **Vercel** (`output: 'standalone'`, `@vercel/analytics`) → **plusieurs
instances éphémères**. `MemoryCacheStore` est par-instance et se vide à chaque cold start :
inutilisable comme source de vérité d'un quota. Le compteur vit dans **un document
Firestore** :

```
Collection : system_config
Document   : algolia-quota
{
  periodKey:   "2026-09",          // clé de période courante (§2)
  count:       8423,               // requêtes facturables observées cette période
  limit:       10000,              // quota inclus Grow
  softLimit:    9000,              // seuil de bascule (marge 10 %)
  alertAt:      8000,              // seuil d'alerte (80 %)
  mode:        "ALGOLIA",          // "ALGOLIA" | "MEILISEARCH_ONLY"
  switchedAt:   null,              // Timestamp de la bascule, ou null
  lastReconciledAt: Timestamp,     // dernière réconciliation avec l'API Usage Algolia
  lastAlertAt:  null,
  updatedAt:    Timestamp
}
```

**Écriture (chemin chaud)** : après `getSearchMode() === "ALGOLIA"` et un appel Algolia réel,
`ref.update({ count: FieldValue.increment(billed), updatedAt: ... })` où `billed =
missIndexes.length`. Une écriture Firestore par lot de requêtes (≈ 1 par chargement de
`/search`). À 23 000 requêtes/mois ≈ **1 écriture / 2 min en moyenne** → très en dessous de la
limite Firestore de ~1 écriture/s soutenue sur un même document. Coût : ~0,01 $/période.
*Si le volume explosait un jour, passer au [distributed counter shardé](https://firebase.google.com/docs/firestore/solutions/counters) — non nécessaire à ce stade.*

**Lecture (chemin chaud)** : ne **pas** lire Firestore à chaque requête. Le document est mis
en cache via `MemoryCacheStore` avec **TTL 60 s**. `getSearchMode()` lit ce cache. Conséquence
assumée : le `count` vu par une instance peut retarder de ≤ 60 s et par le nombre d'instances
actives — d'où la marge `softLimit` à 9 000, pas 10 000.

### 4.3 `getSearchMode()` — la décision

```
getSearchMode():
  snap = cacheMémoire.get("algolia-quota")  // TTL 60 s, sinon lecture Firestore
  cur  = periodKey(now)

  // (a) période roulée → nouvelle période, on repart sur Algolia
  si snap.periodKey != cur:
      déclencher resetPeriod(cur)  // transactionnel, idempotent (§4.4)
      retourner "ALGOLIA"

  // (b) hystérésis : une fois basculé, on reste basculé jusqu'au prochain 9
  si snap.mode == "MEILISEARCH_ONLY":
      retourner "MEILISEARCH_ONLY"

  // (c) seuil atteint → bascule
  si snap.count >= snap.softLimit:
      si meilisearchHealthy():
          transaction: mode="MEILISEARCH_ONLY", switchedAt=now
          invalider le cache mémoire
          retourner "MEILISEARCH_ONLY"
      sinon:
          // Meilisearch KO : on préfère un petit dépassement à une recherche cassée,
          // SAUF si ALGOLIA_HARD_STOP=true (voir §7, décision utilisateur)
          retourner ALGOLIA_HARD_STOP ? "MEILISEARCH_ONLY" : "ALGOLIA"

  // (d) nominal
  retourner "ALGOLIA"
```

**Fail-open** : si Firestore est illisible, `getSearchMode()` retourne `"ALGOLIA"` (recherche
qui marche > économie). L'alerte quotidienne rattrapera une éventuelle dérive.

### 4.4 Remise à zéro de période — double sécurité

**Lazy (dans le chemin de requête)** : la première requête dont `periodKey(now)` dépasse le
`periodKey` stocké exécute `resetPeriod()` en **transaction Firestore** (relit, ne réécrit que
si toujours en retard) → `{ periodKey: nouveau, count: 0, mode: "ALGOLIA", switchedAt: null }`.
Idempotent : deux instances qui courent en même temps ne resettent qu'une fois.

**Planifié (`onSchedule`)** : Cloud Function quotidienne à `00:15 UTC` (même mécanique que
`expireStalePromotions`, `firebase-functions/v2/scheduler`). Elle :
1. force `resetPeriod()` si on a changé de période (filet si aucun trafic n'a déclenché le
   lazy) ;
2. **réconcilie** `count` avec le vrai chiffre Algolia si l'API Usage est accessible (§4.5) ;
3. envoie l'**alerte** (log structuré + e-mail via l'infra `functions/src/email/`) quand
   `count >= alertAt` et pas d'alerte depuis 24 h ;
4. **teste la santé Meilisearch** (`GET /health`) et écrit `meilisearchHealthy` dans le doc,
   pour que `getSearchMode()` n'ait pas à faire ce round-trip lui-même.

### 4.5 Source de vérité : l'API Usage d'Algolia

Notre compteur proxy est un **minorant** : il rate le trafic SEO tant que le levier 2 n'est
pas fait, et tout appel hors proxy futur. Algolia expose la consommation réelle via l'**API
Usage** (`GET https://usage.algolia.com/1/usage/search_operations/period/...` avec une clé
Usage). **À vérifier : disponibilité sur le plan Grow.** Si oui :
- la Cloud Function quotidienne écrase `count` avec le chiffre officiel de la période → le
  garde-fou devient **exact** ;
- notre compteur proxy ne sert plus qu'à réagir **entre** deux réconciliations (résolution
  intra-journalière), ce qui reste indispensable pour attraper un pic en quelques minutes.

Si l'API Usage n'est pas dispo sur Grow : on garde le compteur proxy + on route le SEO par le
proxy (levier 2, obligatoire dans ce cas) + `softLimit` plus conservateur (8 000).

---

## 5. La cible de bascule : Meilisearch doit pouvoir **tout** servir

Pour tenir le « 0 FCFA », quand `mode = MEILISEARCH_ONLY`, Meilisearch répond à **tout** le
trafic de recherche, pas seulement aux facettes :

| Usage | En mode ALGOLIA | En mode MEILISEARCH_ONLY |
|---|---|---|
| Facettes / cascades localisation | **Meilisearch** (permanent, levier 1) | Meilisearch |
| `/search` : texte + pertinence + filtres + pagination | Algolia | **Meilisearch** |
| Carrousel d'accueil (`useRefinementList`) | Algolia | **Meilisearch** |
| Pages SEO `/immobilier/...` | Algolia (via proxy, levier 2) | **Meilisearch** |

Conséquence sur l'indexation (précision du §4 de MEILISEARCH_SETUP) : l'index Meilisearch
**doit porter le document complet**, pas seulement les 7 champs de facettes — sinon `/search`
en mode failover renverrait des cartes vides. On reprend la **même liste `FIELDS`** que
l'extension Algolia.

### Réglages d'index Meilisearch

| Réglage | Valeur | Raison |
|---|---|---|
| `searchableAttributes` | `title`, `description`, `city`, `street`, `province`, `tags` | Recherche texte de `/search` |
| `filterableAttributes` | `state`, `moderationStatus`, `status`, `typeProperty`, `province`, `city`, `street`, `tags`, `categoryId`, `attributes.*`, `price`, `area`, `nbrRooms`, `nbrBathrooms`, `nbrChickens` | Tous les filtres de `AlgoliaContext` + le filtre de visibilité de base |
| `sortableAttributes` | `price`, `area`, `sortTimestamp`, `createdAt` | Tris de `/search` |
| `rankingRules` | `["words","typo","proximity","attribute","sort","exactness","isPromoted:desc","sortTimestamp:desc"]` | Reproduit le custom ranking Algolia (annonces promues d'abord, puis fraîcheur) |
| `faceting.maxValuesPerFacet` | `100` | Aligne sur le besoin des menus |
| `distinctAttribute` | *(aucun)* | Pas de dédup nécessaire, 1 doc = 1 annonce |
| Filtre de visibilité | **à l'indexation** : on n'indexe QUE `state="IN_PROGRESS" AND moderationStatus="APPROVED"`, on supprime le doc quand il sort de cet état | Index plus petit ; évite d'avoir à répéter le filtre partout. Équivaut à `ALGOLIA_BASE_FILTER` |

---

## 6. Le pipeline d'indexation Meilisearch

Contrairement à Algolia (extension officielle, zéro code ici), il faut l'écrire.

### 6.1 Cloud Function `meilisearch-indexer`

`apps/location-maison/functions/src/search/meilisearch-indexer.ts` :
- Déclencheur `onDocumentWritten("properties/{propertyId}")` (v2), région `europe-west1`
  (comme l'extension Algolia).
- Projette le doc sur la liste `FIELDS` (constante partagée avec l'extension pour éviter la
  divergence).
- Si le doc **passe** le filtre de visibilité → `index.addDocuments([projeté])` ;
  sinon → `index.deleteDocument(propertyId)`.
- SDK Node officiel `meilisearch` (`index.addDocuments`, `deleteDocument`).
- Retry (`retryCount: 1`) + dead-letter : sur échec définitif, écrire dans
  `system_config/meilisearch-index-failures/{propertyId}` pour rejeu manuel.
- Clé API **d'indexation** (droits d'écriture) en **secret Firebase**
  (`MEILISEARCH_ADMIN_API_KEY`), jamais dans `.env` en clair — même principe de moindre
  privilège que la séparation search-key / admin-key déjà en place pour Algolia.

### 6.2 Backfill initial

`apps/location-maison/functions/src/search/backfill-meilisearch.ts` — script one-shot
(callable admin ou exécution locale) : parcourt `properties`, pousse par lots de 1 000 les
docs visibles. À lancer une fois l'instance prête, puis à chaque changement de schéma d'index.

### 6.3 Cohérence / fraîcheur

Meilisearch est alimenté par une fonction **distincte** de l'extension Algolia → léger
décalage possible entre les deux moteurs. En fonctionnement nominal, sans effet (Meilisearch
ne sert que des compteurs, tolérants). En mode failover, une nouvelle annonce peut mettre
quelques secondes de plus à apparaître. **Acceptable**, à documenter pour l'exploitation.

---

## 7. La couche de routage (search-gateway)

### 7.1 Généraliser le proxy existant

`src/lib/algolia-search-proxy.ts` est **déjà agnostique** du moteur dans sa logique
(`canonicalize` → clé de cache, résolution de lot avec cache partiel, TTL). On le renomme
`src/lib/search/search-proxy-cache.ts` (logique de cache neutre) et on garde le
`MemoryCacheStore` dédié, partagé Algolia + Meilisearch.

### 7.2 Endpoint

On **conserve le contrat client** `/api/algolia/search` (l'`InstantSearch` client et les
hooks de facettes continuent de l'appeler sans changement) — en interne, il devient
commutable. Optionnellement on l'expose aussi sous l'alias `/api/search` pour la clarté.

Dans la route :
```
POST /api/algolia/search
  requests = body.requests            // forme Algolia, inchangée côté client
  mode = getSearchMode()
  résoudre via search-proxy-cache:
    miss => si mode ALGOLIA   : algoliaLiteClient.search(miss)   ; puis count += miss.length
            si mode MEILI     : meiliAdapter.multiSearch(miss)   ; count inchangé
  réponse : toujours la forme Algolia { results: [...] }
```

### 7.3 L'adaptateur Algolia ↔ Meilisearch

C'est le vrai travail d'ingénierie. Le sous-ensemble de paramètres réellement utilisé (relevé
par `grep` sur le code actuel) est **petit** : `query`, `filters`, `facets`, `hitsPerPage`,
`page`, `attributesToRetrieve`, `attributesToHighlight`.

| Algolia (requête) | Meilisearch (requête) |
|---|---|
| `query` | `q` |
| `filters` (chaîne `a:"x" AND (b:"y" OR b:"z")`) | `filter` (tableau / expression) — **parser dédié** (petit, testable) ; ré-appliquer toujours le filtre de visibilité |
| `facets: [...]` | `facets: [...]` |
| `hitsPerPage`, `page` | `limit`, `offset = page * hitsPerPage` |
| `hitsPerPage: 0` (compteurs seuls) | `limit: 0` |

| Meilisearch (réponse) | Algolia (réponse attendue par InstantSearch) |
|---|---|
| `hits` | `hits` (+ `objectID` = `id` du doc) |
| `estimatedTotalHits` | `nbHits` |
| — | `nbPages = ceil(nbHits / hitsPerPage)`, `page` |
| `facetDistribution` | `facets` |
| `processingTimeMs` | `processingTimeMS` |

**Alternative** : `@meilisearch/instant-meilisearch` embarque déjà ce mapping. On peut soit
s'en servir directement comme `searchClient` alternatif de `<InstantSearch>`, soit reprendre
son adaptateur. Vu qu'on centralise **côté serveur** derrière un seul endpoint, un adaptateur
maison ciblé sur ces ~7 paramètres est plus simple à tester unitairement et sans dépendance
front supplémentaire. **Décision d'implémentation à trancher au moment de coder.**

### 7.4 Pages SEO

`searchLandingProperties()` : remplacer le `fetch` direct vers `*.algolia.net` par un appel au
**même resolver** (import serveur direct de `resolveSearchRequests`, pas un aller-retour HTTP
interne). Bénéfice : compté, basculable, mutualisé. L'ISR `revalidate: 900` reste.

### 7.5 Carrousel d'accueil

`useRefinementList` vit dans le `<InstantSearch>` partagé → il suit la bascule
automatiquement, **aucun travail dédié**.

---

## 8. Modes de défaillance et garde-fous du garde-fou

| Panne | Comportement | Mitigation |
|---|---|---|
| Meilisearch VM injoignable **pendant** le failover | Recherche cassée | `getSearchMode()` teste `meilisearchHealthy` (rafraîchi par la CF quotidienne + check à la volée sur bascule). Si KO : retour Algolia **sauf** `ALGOLIA_HARD_STOP=true`. Health check aussi dans `/health`. |
| Firestore illisible | — | Fail-open : `getSearchMode()` → `ALGOLIA` |
| Compteur proxy sous-évalue le réel | Bascule trop tard, petit dépassement | Réconciliation quotidienne via API Usage (§4.5) ; `softLimit` conservateur ; router le SEO par le proxy |
| Deux instances basculent en même temps | — | Transaction Firestore idempotente sur `mode` |
| Indexeur Meilisearch en retard | Annonce récente absente en failover quelques secondes | Documenté, acceptable ; dead-letter pour les échecs durs |
| Reset de période raté (aucun trafic le 9) | Reste en `MEILISEARCH_ONLY` après le 9 | CF `onSchedule` quotidienne force le reset |

---

## 9. Coût du dispositif

| Poste | Coût récurrent |
|---|---|
| VM Meilisearch — GCP e2-micro **Always Free** (voir MEILISEARCH_SETUP §2) | **0 $** |
| Firestore — compteur : ~1 écriture / lot de requêtes (~quelques milliers/période) | **< 0,02 $/période** |
| Firestore — lecture du mode : cache mémoire 60 s, ~1 lecture/min/instance | **négligeable** |
| Cloud Function `onSchedule` quotidienne + `meilisearch-indexer` (déjà sur Blaze) | **free tier** |
| **Total net nouveau** | **≈ 0 $** |

À comparer aux **6,50 $ / période** actuels, appelés à croître avec le trafic.

---

## 10. Variables d'environnement

| Variable | Où | Rôle | Défaut |
|---|---|---|---|
| `ALGOLIA_BILLING_ANCHOR_DAY` | Vercel + functions | Jour de remise à zéro du quota | `9` |
| `ALGOLIA_MONTHLY_QUOTA` | Vercel + functions | Quota inclus | `10000` |
| `ALGOLIA_QUOTA_SOFT_LIMIT` | Vercel + functions | Seuil de bascule | `9000` |
| `ALGOLIA_QUOTA_ALERT_AT` | functions | Seuil d'alerte 80 % | `8000` |
| `ALGOLIA_HARD_STOP` | Vercel | `true` = jamais d'appel Algolia au-delà du seuil même si Meilisearch KO (recherche peut casser) ; `false` = tolère un petit dépassement plutôt qu'une panne | `false` |
| `ALGOLIA_USAGE_API_KEY` | functions (secret) | Clé API Usage pour la réconciliation quotidienne | — |
| `MEILISEARCH_HOST` | Vercel + functions | URL instance (`http://<ip>:7700`) | — |
| `MEILISEARCH_SEARCH_API_KEY` | Vercel | Clé recherche seule (gateway) | — |
| `MEILISEARCH_ADMIN_API_KEY` | functions (secret) | Clé indexation (CF indexeur uniquement) | — |
| `MEILISEARCH_INDEX_NAME` | Vercel + functions | Nom d'index | `location-maison_property` |

---

## 11. Plan de mise en œuvre par phases

### Phase A — Observabilité, sans Meilisearch — ✅ **LIVRÉ (2026-09-09)**
1. ✅ Document Firestore `system_config/algolia-quota` + helpers `billingPeriodKey()` /
   `getQuotaStatus()` / `getSearchMode()` en **mode observation** (`getSearchMode()` renvoie
   toujours `ALGOLIA` tant que `isQuotaEnforced()` est faux ; on ne fait qu'incrémenter + alerter).
2. ✅ Instrumenter `/api/algolia/search` : `recordAlgoliaQueries(billedQueries)` où
   `billedQueries` s'accumule sur `missRequests.length` (les hits de cache ne comptent pas).
3. ✅ Instrumenter `searchLandingProperties()` (levier 2) via
   `recordAlgoliaQueriesOncePerWindow(key, 900)` — dédup par fenêtre ISR. *Note :* le `fetch`
   direct est conservé (meilleur cache que le proxy pour ce cas) ; il basculera vers
   Meilisearch en Phase B/C, pas via ce proxy.
4. ✅ CF `monitorAlgoliaSearchQuota` (`onSchedule`, `15 0 * * *` UTC) : reset de période +
   réconciliation API Usage (si `ALGOLIA_USAGE_API_KEY`) + alerte 80 % (log structuré +
   e-mail Hostinger, cooldown 24 h, destinataire `SEARCH_QUOTA_ALERT_EMAIL` ou
   `contact@tonnkama.com`).
5. ✅ Carte admin `/admin/search-quota` (`SearchQuotaCard`) + API `/api/admin/search-quota`
   (garde `Admin`).
6. ⏳ **Vérification à faire sur une période complète** : comparer `count` à la prochaine
   facture Algolia (période close le 08/10/2026) → cale le modèle et confirme le fuseau du
   reset. Trace réseau avant/après pour le SEO.

> Livre déjà une **alerte** avant dépassement et des **chiffres réels** sur la répartition du
> trafic, sans dépendre de l'hébergement Meilisearch.

### Phase B — Meilisearch en complément permanent *(après provisioning)*
7. **Utilisateur** : créer la VM GCP e2-micro + Meilisearch en Docker, fournir `MEILISEARCH_HOST`
   et les clés.
8. CF `meilisearch-indexer` + réglages d'index (§5) + script de backfill.
9. Basculer `useAlgoliaFacetOptions` / `useAlgoliaLocationOptions` sur Meilisearch (levier 1).
10. **Vérification** : trace réseau montrant les facettes vers `/api/search` (moteur Meili),
    compteurs identiques à l'affichage Algolia précédent, `tsc` + Jest. Re-mesurer `count` sur
    une période → probablement déjà < 10 000.

### Phase C — Failover armé
11. Adaptateur Algolia↔Meilisearch (§7.3) + commutation de moteur dans la gateway.
12. Passer `getSearchMode()` en **mode enforcing**.
13. **Vérification** : en préprod, forcer `ALGOLIA_QUOTA_SOFT_LIMIT=10` → confirmer que
    `/search`, le carrousel et les pages SEO répondent correctement en mode Meilisearch, puis
    que le reset au 9 rebascule sur Algolia. Test de coupure Meilisearch → comportement
    `ALGOLIA_HARD_STOP` attendu.

---

## 12. Visibilité admin

Nouvelle carte dans l'espace admin (à côté de `src/app/(protected)/admin/phone-config`), lisant
`system_config/algolia-quota` :
- période courante + dates (`09/09 → 08/10`) ;
- jauge `count / 10 000` avec seuils 80 % / 90 % ;
- **mode actif** : `Algolia` (vert) / `Meilisearch — secours quota` (orange) + date de bascule ;
- santé Meilisearch (`/health`) ;
- date de dernière réconciliation avec l'API Usage.
- Bouton admin **« forcer le retour Algolia »** (remet `mode=ALGOLIA` manuellement, pour le cas
  où on veut ré-autoriser un petit dépassement en fin de période).

---

## 13. Décisions à trancher par l'utilisateur

1. **Hébergement Meilisearch** : confirmer GCP e2-micro Always Free (reco MEILISEARCH_SETUP §2),
   ou indiquer un autre choix.
2. **`ALGOLIA_HARD_STOP`** : `false` (recommandé — tolère un dépassement de quelques centimes
   plutôt qu'une recherche cassée si Meilisearch tombe) ou `true` (0 FCFA absolu, risque de
   panne de recherche).
3. **Fuseau/heure exacte du reset du 9** : à relever dans le dashboard Algolia (Billing) — ou
   on cale sur la prochaine facture en Phase A.
4. **API Usage Algolia sur Grow** : vérifier la disponibilité + générer une clé Usage. Si
   indisponible, la Phase A (routage SEO par le proxy) devient obligatoire, pas optionnelle.
5. **Adaptateur** : maison (ciblé, ~7 params, testable) vs `@meilisearch/instant-meilisearch`
   (à trancher au moment de coder la Phase C).

---

*Créé le 2026-09-09. Base d'analyse et d'architecture — à valider (surtout §13) avant toute
implémentation.*
