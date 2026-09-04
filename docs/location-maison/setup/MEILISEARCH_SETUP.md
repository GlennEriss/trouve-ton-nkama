# Mise en place de Meilisearch en complément d'Algolia

**Objectif, explicite** : Meilisearch n'est **pas** un remplacement d'Algolia. Algolia reste le
moteur de la recherche principale (texte libre + pertinence sur `/search`). Meilisearch prend en
charge le trafic qui n'a structurellement aucun besoin de pertinence — des comptages et des
listes de valeurs distinctes — pour réduire le volume de requêtes réellement facturées par
Algolia. Contexte complet (diagnostic, cache serveur déjà en place) :
[ALGOLIA-COST-AUDIT-2026-09.md](../troubleshooting/ALGOLIA-COST-AUDIT-2026-09.md).

Ce document est un **plan** — rien n'est encore implémenté ni provisionné. Il sert de base de
décision (surtout la partie hébergement) avant d'écrire le moindre code d'indexation.

---

## 1. Qui prend quoi — répartition du trafic

| Trafic | Fichier(s) concerné(s) | Aujourd'hui | Après |
|---|---|---|---|
| Recherche texte + résultats triés par pertinence (`/search`) | `AlgoliaContext.tsx`, `SearchDesktopPage.tsx`, `SearchMobilePage.tsx` | Algolia | **Reste sur Algolia** |
| Compteurs de facettes (types de bien, tags, attributs Mode) | `src/hooks/useAlgoliaFacetOptions.ts` | Algolia (via le proxy caché mis en place le 04/09) | **Meilisearch** |
| Cascade de localisation (Province → Ville → Rue) | `src/hooks/useAlgoliaLocationOptions.ts` | Algolia (idem) | **Meilisearch** |
| Widget `useRefinementList` du carrousel d'accueil | `HomePage.tsx` (via `AlgoliaContext`) | Algolia | Reste sur Algolia pour l'instant (partage le même `<InstantSearch>` que `/search` — à isoler séparément si on veut le basculer aussi, hors périmètre de ce document) |

Cette frontière n'est pas arbitraire : `useAlgoliaFacetOptions`/`useAlgoliaLocationOptions`
n'utilisent déjà **aucune fonctionnalité spécifique à Algolia** — juste `facets` +
`hitsPerPage: 0`, une opération que n'importe quel moteur de facettes sait faire, Meilisearch
inclus. Ce sont, sur la base du dernier audit, les hooks appelés le plus souvent (chaque
ouverture de filtre, chaque sélection de ville) — donc la plus grosse part du volume Algolia
restant après la mise en cache.

**Rien ne change côté Algolia** : même extension d'indexation, même index, même clé, même
facture pour la partie qu'il continue de servir.

---

## 2. Où l'héberger sans frais

Meilisearch n'a pas d'offre gratuite permanente côté éditeur (Meilisearch Cloud est un essai
payant) — il faut l'auto-héberger. Comparatif des options réellement gratuites en continu (pas
un crédit d'essai qui expire) :

| Option | Coût réel | Persistant ? | Risque | Remarque |
|---|---|---|---|---|
| **Google Cloud e2-micro (Always Free)** ⭐ | 0€ en continu, tant qu'on reste dans les limites *Always Free* (1 instance e2-micro, région us-west1/us-central1/us-east1, 30 Go disque) | Oui (disque persistant standard) | Carte bancaire demandée à l'inscription pour vérification d'identité, **mais non débitée** tant qu'on ne bascule pas explicitement sur la facturation payante — GCP bloque les dépassements par défaut sur le free tier, contrairement à un abonnement classique | **Recommandé** : même projet/compte que celui déjà utilisé pour Firebase (Cloud Functions déjà en plan Blaze) — aucune nouvelle relation fournisseur, même console, mêmes réflexes |
| **Oracle Cloud Always Free (ARM Ampere A1)** | 0€ en continu | Oui | Compte à créer chez un nouveau fournisseur ; inscriptions historiquement capricieuses selon les pays/régions (délais de validation, capacité limitée) | Specs bien plus généreuses (jusqu'à 4 OCPU / 24 Go RAM au total) — utile si l'index grossit beaucoup, mais à ne considérer qu'en repli si GCP e2-micro s'avère trop juste |
| Render (plan gratuit) | 0€ | **Non** — pas de disque persistant sur le plan gratuit | L'index Meilisearch serait perdu à chaque redémarrage du service | Écarté : rédhibitoire pour un moteur de recherche |
| Fly.io | Annoncé "free allowances" mais carte bancaire obligatoire et facturation à l'usage au-delà d'un petit crédit | Oui | Risque de facture surprise si le trafic ou le disque dépasse le crédit | Écarté explicitement : c'est exactement le type de surprise qui a mené à suspendre Redis |
| Railway | Plus de plan gratuit permanent (crédit d'essai unique) | Oui | Passe en payant après le crédit | Écarté : ne tient pas la contrainte "sans frais" dans la durée |

**Recommandation** : **GCP e2-micro Always Free**, dans le même projet Firebase que
`trouve-ton-nkama` (donc le même compte de facturation déjà connu). 1 Go de RAM est correct pour
un index de quelques centaines à quelques milliers d'annonces (le volume actuel du produit) ; si
ça devient trop juste, migrer vers Oracle Cloud plus tard est un simple export/import d'index, pas
une réécriture.

**Décision à prendre par vous avant la suite** : confirmer ce choix (ou en indiquer un autre), et
créer le compte/projet si besoin — c'est la seule étape que je ne peux pas faire à votre place.

---

## 3. Comment le cache serveur s'applique aussi à Meilisearch

Le cache mis en place le 04/09 pour Algolia (voir l'audit) n'est pas spécifique à Algolia dans sa
logique : `resolveAlgoliaSearchRequests` (dans `src/lib/algolia-search-proxy.ts`) fait trois
choses génériques — canonicaliser une requête en clé de cache stable, ne renvoyer au moteur que
les requêtes manquantes d'un lot, mettre les nouveaux résultats en cache mémoire avec un TTL.
Rien de tout ça n'est couplé au format Algolia.

**Plan** : généraliser ce fichier en `src/lib/search-proxy-cache.ts` (logique de cache neutre,
indépendante du moteur), puis deux implémentations fines par-dessus :

- `src/app/api/algolia/search/route.ts` (existant, inchangé dans son comportement)
- `src/app/api/meilisearch/search/route.ts` (nouveau) — même schéma : reçoit un lot de requêtes,
  sert ce qui est en cache, n'interroge Meilisearch que pour le reste, met en cache le résultat.

Un seul cache mémoire process (`MemoryCacheStore`, déjà écrit, déjà testé) suffit pour les deux —
pas de nouvelle dépendance, pas de Redis, cohérent avec la contrainte actuelle.

Les hooks `useAlgoliaFacetOptions.ts`/`useAlgoliaLocationOptions.ts` pointeraient vers un nouveau
petit client (`src/lib/meilisearch-cached-search-client.ts`, même idée que le client Algolia
"cache-aware" existant) appelant `/api/meilisearch/search` au lieu de `/api/algolia/search`.

---

## 4. Indexation — ce qu'il faut écrire (et pourquoi ce n'est pas automatique)

Contrairement à Algolia, synchronisé aujourd'hui **sans code côté ce dépôt** par l'extension
Firebase officielle `algolia/firestore-algolia-search` (voir
`apps/location-maison/extensions/firestore-algolia-search.env` — collection `properties`, champs
`typeProperty`, `tags`, `province`, `city`, `street`, `attributes`, etc.), Meilisearch n'a pas
d'extension Firebase équivalente maintenue officiellement.

**Il faudra écrire une Cloud Function dédiée** dans `apps/location-maison/functions/src/`
(nouveau dossier, ex. `search/meilisearch-indexer.ts`) :

- Déclencheur Firestore `onDocumentWritten('properties/{propertyId}')` — le même événement que
  celui écouté par l'extension Algolia.
- Transformation du document vers les seuls champs dont Meilisearch a besoin pour les facettes
  qu'il servira : `typeProperty`, `tags`, `attributes`, `province`, `city`, `street`, `state`,
  `moderationStatus` (mêmes filtres de visibilité qu'`ALGOLIA_BASE_FILTER` aujourd'hui —
  `state:"IN_PROGRESS" AND moderationStatus:"APPROVED"` — à reproduire côté Meilisearch comme un
  filtre appliqué à l'index, pas dans chaque requête).
- Appel au SDK Node officiel `meilisearch` (`index.addDocuments([...])` / `deleteDocument(id)` à
  la suppression) — quelques dizaines de lignes, pas une réécriture.
- Une clé API Meilisearch dédiée à l'indexation (droits d'écriture), distincte de la clé
  "recherche seule" utilisée par la route `/api/meilisearch/search` — même principe de moindre
  privilège que la séparation search-key/admin-key déjà en place pour Algolia.

**Pourquoi ce n'est pas écrit dans ce même passage** : sans instance Meilisearch qui tourne, ce
code ne serait pas vérifiable (ni par `tsc`/tests unitaires purs, ni par un test d'intégration
réel contre l'API) — écrire un client contre une API qui n'existe pas encore risquerait de
livrer du code jamais réellement testé contre le vrai service. Une fois l'instance choisie et
créée (§2), cette Cloud Function + les deux routes/clients (§3) peuvent être codés et testés en
un seul passage.

---

## 5. Étapes, dans l'ordre

1. **Vous** : choisir/confirmer l'hébergement (§2) et créer l'instance (VM + Meilisearch en
   Docker, ou tout autre moyen de déploiement de votre choix sur cette VM).
2. **Vous** : me communiquer l'URL de l'instance et sa clé API (recherche seule d'abord, clé
   d'indexation ensuite) — jamais dans un message en clair si vous préférez, une variable
   d'environnement suffit, je n'ai pas besoin de voir la valeur.
3. **Moi** : généraliser le cache existant (§3), écrire la Cloud Function d'indexation (§4),
   lancer une indexation initiale (`DO_FULL_INDEXING` côté Meilisearch, équivalent du paramètre
   déjà utilisé par l'extension Algolia), rebrancher les deux hooks de facettes.
4. **Vérification** (même méthode que pour le cache Algolia) : trace réseau live avant/après
   montrant le nouveau trafic vers `/api/meilisearch/search` et son absence côté Algolia pour ces
   deux hooks, tests unitaires, `tsc` propre.
5. **Vous** : valider que les compteurs/filtres affichés sont identiques à avant (même source de
   vérité Firestore, juste un moteur de facettes différent) avant de considérer l'étape terminée.

---

## 6. Variables d'environnement à prévoir

| Variable | Où | Rôle |
|---|---|---|
| `MEILISEARCH_HOST` | `apps/location-maison/.env.local*` | URL de l'instance (ex. `http://<ip-vm>:7700`) |
| `MEILISEARCH_SEARCH_API_KEY` | idem | Clé recherche seule, utilisée par `/api/meilisearch/search` |
| `MEILISEARCH_ADMIN_API_KEY` | `apps/location-maison/functions` (secret Firebase, jamais en clair) | Clé d'indexation, utilisée uniquement par la Cloud Function |
| `MEILISEARCH_INDEX_NAME` | les deux | Nom de l'index (ex. `location-maison_property-facets`) |

*Créé le 2026-09-04, avant toute implémentation — sert de base à valider avant de coder.*
