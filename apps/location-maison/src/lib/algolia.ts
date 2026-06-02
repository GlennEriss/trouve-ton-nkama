import { liteClient as algoliasearch } from 'algoliasearch/lite';

export const algoliaClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!
);

export const ALGOLIA_INDEX_NAME = 'location-maison_property-index';
// Applied to all facet queries so we only surface active listings
export const ALGOLIA_BASE_FILTER = 'state:"IN_PROGRESS"';
