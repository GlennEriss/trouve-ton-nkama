import { createLogger } from '@/lib/logger';
import {
  getCityConfig,
  getTransactionConfig,
  getTypeConfig,
  type PropertyTypeSlug,
  type TransactionSlug,
} from '@/lib/seo/landing-taxonomy';

const logger = createLogger('seo.algolia-listings');

const DEFAULT_ALGOLIA_INDEX = 'location-maison_property-index';
const DEFAULT_HITS_PER_PAGE = 18;
const ALGOLIA_REVALIDATE_SECONDS = 900;

type AlgoliaLandingHit = {
  objectID?: string;
  id?: string;
  path?: string;
  title?: string;
  description?: string;
  price?: number | string;
  city?: string;
  province?: string;
  images?: Array<{ fileURL?: string } | string>;
};

type AlgoliaLandingResponse = {
  hits?: AlgoliaLandingHit[];
  nbHits?: number;
  nbPages?: number;
  page?: number;
  hitsPerPage?: number;
};

export type LandingPropertyCard = {
  id: string;
  detailsHref: string;
  title: string;
  description: string;
  price: number | string | undefined;
  city: string;
  province: string;
  images: Array<{ fileURL?: string } | string>;
};

export type LandingSearchResult = {
  items: LandingPropertyCard[];
  currentPage: number;
  totalPages: number;
  totalHits: number;
  hitsPerPage: number;
};

function sanitizePage(page: number | undefined): number {
  if (!Number.isFinite(page) || !page) {
    return 1;
  }

  return Math.max(1, Math.trunc(page));
}

function escapeFilterValue(value: string): string {
  return value.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildFilters(options: {
  status: string;
  typePropertyValues: string[];
  cityLabel?: string;
}): string {
  const filters: string[] = ['state:"IN_PROGRESS"', `status:"${escapeFilterValue(options.status)}"`];

  if (options.typePropertyValues.length > 0) {
    filters.push(
      `(${options.typePropertyValues
        .map((value) => `typeProperty:"${escapeFilterValue(value)}"`)
        .join(' OR ')})`
    );
  }

  if (options.cityLabel) {
    filters.push(`city:"${escapeFilterValue(options.cityLabel)}"`);
  }

  return filters.join(' AND ');
}

function mapHitToLandingProperty(hit: AlgoliaLandingHit): LandingPropertyCard | null {
  const rawId = hit.objectID || hit.id || hit.path?.replace(/^properties\//, '');
  const id = typeof rawId === 'string' ? rawId.trim() : '';

  if (!id) {
    return null;
  }

  return {
    id,
    detailsHref: `/houseDetails/${id}`,
    title: typeof hit.title === 'string' && hit.title.trim().length > 0 ? hit.title : 'Annonce immobiliere',
    description:
      typeof hit.description === 'string' && hit.description.trim().length > 0
        ? hit.description
        : 'Consultez les details de cette annonce immobiliere sur Trouve Ton Nkama.',
    price: hit.price,
    city: typeof hit.city === 'string' ? hit.city : '',
    province: typeof hit.province === 'string' ? hit.province : '',
    images: Array.isArray(hit.images) ? hit.images : [],
  };
}

export async function searchLandingProperties(options: {
  transaction: TransactionSlug;
  type: PropertyTypeSlug;
  citySlug?: string;
  page?: number;
  hitsPerPage?: number;
}): Promise<LandingSearchResult> {
  const { transaction, type, citySlug } = options;
  const hitsPerPage = Math.max(1, Math.trunc(options.hitsPerPage ?? DEFAULT_HITS_PER_PAGE));
  const currentPage = sanitizePage(options.page);

  const transactionConfig = getTransactionConfig(transaction);
  const typeConfig = getTypeConfig(type);
  const cityConfig = citySlug ? getCityConfig(citySlug) : null;

  if (!transactionConfig || !typeConfig || (citySlug && !cityConfig)) {
    return {
      items: [],
      currentPage: 1,
      totalPages: 0,
      totalHits: 0,
      hitsPerPage,
    };
  }

  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;
  const indexName = process.env.ALGOLIA_INDEX_NAME ?? DEFAULT_ALGOLIA_INDEX;

  if (!appId || !apiKey) {
    logger.error('Missing Algolia credentials for landing search');
    return {
      items: [],
      currentPage: 1,
      totalPages: 0,
      totalHits: 0,
      hitsPerPage,
    };
  }

  const filters = buildFilters({
    status: transactionConfig.status,
    typePropertyValues: typeConfig.typePropertyValues,
    cityLabel: cityConfig?.label,
  });

  const cacheTags = [
    'landing-properties',
    `landing-properties:${transactionConfig.slug}:${typeConfig.slug}`,
    cityConfig ? `landing-properties:${transactionConfig.slug}:${typeConfig.slug}:${cityConfig.slug}` : null,
  ].filter((value): value is string => Boolean(value));

  try {
    const response = await fetch(
      `https://${appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(indexName)}/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Algolia-Application-Id': appId,
          'X-Algolia-API-Key': apiKey,
        },
        body: JSON.stringify({
          query: '',
          filters,
          page: currentPage - 1,
          hitsPerPage,
          clickAnalytics: false,
          analytics: false,
        }),
        next: {
          revalidate: ALGOLIA_REVALIDATE_SECONDS,
          tags: cacheTags,
        },
      }
    );

    if (!response.ok) {
      const payload = await response.text();
      logger.error('Algolia landing query failed', {
        status: response.status,
        payload,
        transaction,
        type,
        citySlug,
        currentPage,
      });

      return {
        items: [],
        currentPage,
        totalPages: 0,
        totalHits: 0,
        hitsPerPage,
      };
    }

    const data = (await response.json()) as AlgoliaLandingResponse;
    const items = Array.isArray(data.hits)
      ? data.hits
          .map((hit) => mapHitToLandingProperty(hit))
          .filter((hit): hit is LandingPropertyCard => Boolean(hit))
      : [];

    const totalPages = typeof data.nbPages === 'number' ? Math.max(0, Math.trunc(data.nbPages)) : 0;
    const normalizedPage = typeof data.page === 'number' ? Math.max(1, Math.trunc(data.page) + 1) : currentPage;
    const totalHits = typeof data.nbHits === 'number' ? Math.max(0, Math.trunc(data.nbHits)) : 0;
    const returnedHitsPerPage =
      typeof data.hitsPerPage === 'number' ? Math.max(1, Math.trunc(data.hitsPerPage)) : hitsPerPage;

    return {
      items,
      currentPage: normalizedPage,
      totalPages,
      totalHits,
      hitsPerPage: returnedHitsPerPage,
    };
  } catch (error) {
    logger.error('Failed to fetch Algolia landing results', {
      error,
      transaction,
      type,
      citySlug,
      currentPage,
    });

    return {
      items: [],
      currentPage,
      totalPages: 0,
      totalHits: 0,
      hitsPerPage,
    };
  }
}
