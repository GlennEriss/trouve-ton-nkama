import { NextResponse } from 'next/server';

import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import { loadOSMLocationsFromRaw, serializeOSMLocationsData } from '@/data/gabon-osm-locations';
import { createLogger } from '@/lib/logger';
import {
  loadGabonOsmProjectionSerializableServer,
  shouldPreferGabonOsmProjectionServer,
} from '@/lib/location/gabon-osm-projection.server';
import { getGabonOsmRootServer } from '@/lib/location/gabon-osm-source.server';

const logger = createLogger('api.location.osm.gabon');

const CACHE_TTL_SECONDS = Math.max(
  60,
  Math.floor(Number(process.env.OSM_SOURCE_CACHE_TTL_MS ?? 300000) / 1000)
);

export async function GET() {
  try {
    if (shouldPreferGabonOsmProjectionServer()) {
      const projection = await loadGabonOsmProjectionSerializableServer();
      if (projection) {
        return NextResponse.json(
          {
            success: true,
            data: projection.data,
            source: projection.source,
          },
          {
            headers: {
              'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
            },
          }
        );
      }
    }

    const source = await getGabonOsmRootServer();
    if (!source) {
      return jsonApiError(
        503,
        'OSM_UNAVAILABLE',
        'Impossible de charger la source OSM Gabon (cloud + fallback local).'
      );
    }

    const parsed = loadOSMLocationsFromRaw(source.root);
    if (!parsed) {
      return jsonApiError(500, 'OSM_PARSE_FAILED', 'Le fichier OSM Gabon est invalide.');
    }

    return NextResponse.json(
      {
        success: true,
        data: serializeOSMLocationsData(parsed),
        source: source.source,
      },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
        },
      }
    );
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/location/osm/gabon',
      fallbackMessage: 'Impossible de charger les données OSM Gabon.',
    });
  }
}
