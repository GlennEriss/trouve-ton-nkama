import { NextRequest, NextResponse } from 'next/server';
import redis from '@/redis/client';
import { z } from 'zod';
import { AppError } from '@/lib/errors/app-error';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.location.search');

const searchParamsSchema = z.object({
  q: z.string().min(2, 'La recherche doit contenir au moins 2 caractères').max(100),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 8)),
});

interface PhotonResult {
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    name: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
  };
}

interface PhotonResponse {
  features: PhotonResult[];
}

interface CachedSearchResult {
  results: PhotonResult[];
  timestamp: number;
  query: string;
}

const REDIS_KEYS = {
  SEARCH_CACHE: (query: string) => `photon:search:${query.toLowerCase()}`,
  AUTOCOMPLETE: 'gabon:autocomplete',
  POPULAR_SEARCHES: 'gabon:popular',
} as const;

const CACHE_TTL = 7 * 24 * 60 * 60;
const POPULAR_SEARCHES_LIMIT = 50;

async function fetchFromPhoton(query: string, limit = 8): Promise<PhotonResult[]> {
  const searchQuery = `${query.trim()} Gabon`;

  try {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&lat=0.7&lon=11.5&limit=${limit}`,
      {
        headers: {
          'User-Agent': 'Location-Search-App/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new AppError(`Photon API error: ${response.status}`, {
        code: 'PHOTON_API_ERROR',
        status: 502,
        details: { status: response.status },
      });
    }

    const data: PhotonResponse = await response.json();

    return data.features
      .filter(
        (feature) =>
          feature.properties.countrycode === 'ga' ||
          feature.properties.country?.toLowerCase().includes('gabon')
      )
      .map((feature) => ({
        geometry: feature.geometry,
        properties: {
          name: feature.properties.name?.trim() || '',
          city: feature.properties.city?.trim(),
          state: feature.properties.state?.trim(),
          country: feature.properties.country?.trim(),
          countrycode: feature.properties.countrycode?.toLowerCase(),
          osm_type: feature.properties.osm_type,
          osm_key: feature.properties.osm_key,
          osm_value: feature.properties.osm_value,
        },
      }))
      .filter((feature) => feature.properties.name);
  } catch (error) {
    logger.error('Photon fetch failed', { query, limit, error });
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Service de géolocalisation temporairement indisponible', {
      code: 'PHOTON_TEMPORARY_UNAVAILABLE',
      status: 503,
    });
  }
}

async function updateAutocomplete(query: string, results: PhotonResult[]) {
  try {
    await redis.zadd(REDIS_KEYS.AUTOCOMPLETE, {
      score: Date.now(),
      member: query.toLowerCase(),
    });

    await redis.zremrangebyrank(REDIS_KEYS.AUTOCOMPLETE, 0, -1001);

    const locationNames = results
      .map((r) => r.properties.name?.toLowerCase())
      .filter(Boolean);

    if (locationNames.length > 0) {
      const members = locationNames.map((name) => ({
        score: Date.now(),
        member: name,
      }));

      for (const member of members) {
        await redis.zadd(REDIS_KEYS.AUTOCOMPLETE, member as { score: number; member: string });
      }
    }
  } catch (error) {
    logger.warn('Autocomplete update failed', { query, error });
  }
}

async function trackSearchPopularity(query: string) {
  try {
    await redis.zincrby(REDIS_KEYS.POPULAR_SEARCHES, 1, query.toLowerCase());
    await redis.zremrangebyrank(REDIS_KEYS.POPULAR_SEARCHES, 0, -(POPULAR_SEARCHES_LIMIT + 1));
  } catch (error) {
    logger.warn('Search popularity tracking failed', { query, error });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = searchParamsSchema.safeParse({
      q: searchParams.get('q'),
      limit: searchParams.get('limit'),
    });

    if (!validation.success) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Paramètres invalides', {
        issues: validation.error.issues,
      });
    }

    const { q: query, limit } = validation.data;
    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = REDIS_KEYS.SEARCH_CACHE(normalizedQuery);

    try {
      const cachedResult = await redis.get(cacheKey);

      if (cachedResult) {
        const parsed: CachedSearchResult = JSON.parse(cachedResult as string);
        await trackSearchPopularity(normalizedQuery);

        return NextResponse.json({
          results: parsed.results,
          cached: true,
          timestamp: parsed.timestamp,
          query: parsed.query,
        });
      }
    } catch (redisError) {
      logger.warn('Redis read cache failed for location search', {
        cacheKey,
        error: redisError,
      });
    }

    const results = await fetchFromPhoton(query, limit);

    const cacheData: CachedSearchResult = {
      results,
      timestamp: Date.now(),
      query: normalizedQuery,
    };

    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(cacheData));

      await Promise.all([updateAutocomplete(normalizedQuery, results), trackSearchPopularity(normalizedQuery)]);
    } catch (redisError) {
      logger.warn('Redis write cache failed for location search', {
        cacheKey,
        error: redisError,
      });
    }

    return NextResponse.json({
      results,
      cached: false,
      timestamp: Date.now(),
      query: normalizedQuery,
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/location/search',
      fallbackMessage: "Erreur dans l'API de recherche",
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = searchParamsSchema.safeParse(body);

    if (!validation.success) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Données invalides', {
        issues: validation.error.issues,
      });
    }

    const searchParams = new URLSearchParams({
      q: validation.data.q,
      limit: String(validation.data.limit),
    });
    const url = new URL(`${request.url}?${searchParams}`);
    const newRequest = new NextRequest(url, { method: 'GET' });

    return GET(newRequest);
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/location/search',
      fallbackMessage: 'Erreur lors du parsing de la requête',
    });
  }
}
