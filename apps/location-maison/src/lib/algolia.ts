import { createCachedAlgoliaSearchClient } from './algolia-cached-search-client';

// Le client Algolia brut (algoliasearch/lite, appel direct navigateur -> Algolia) a été
// remplacé par un client "cache-aware" avec la même méthode `.search()` : il route
// chaque appel via /api/algolia/search, qui mutualise les requêtes identiques entre
// visiteurs (cache serveur mémoire, TTL court) au lieu de facturer un appel Algolia par
// visiteur et par interaction (filtres Mode, cascade Province/Ville/Rue, widgets
// InstantSearch...). Voir docs/location-maison/troubleshooting/ALGOLIA-COST-AUDIT-2026-09.md.
export const algoliaClient = createCachedAlgoliaSearchClient();

export const ALGOLIA_INDEX_NAME = 'location-maison_property-index';
// Applied to all facet queries so we only surface active, moderation-approved listings
export const ALGOLIA_BASE_FILTER = 'state:"IN_PROGRESS" AND moderationStatus:"APPROVED"';
