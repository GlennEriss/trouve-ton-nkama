import { NextRequest, NextResponse } from 'next/server';
import { getPropertyStatistics } from '@/db/property-statistics.db';
import { AppError } from '@/lib/errors/app-error';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.property.statistics');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { adminAuth } = await import('@/firebase/admin');

    const { id } = await params;

    if (!id) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Property ID is required', { field: 'id' });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonApiError(401, 'UNAUTHORIZED', "Token d'authentification requis");
    }

    const token = authHeader.split('Bearer ')[1];

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      logger.warn('Invalid auth token for property statistics', { id, error });
      return jsonApiError(401, 'AUTH_TOKEN_INVALID', 'Token invalide');
    }

    const userId = decodedToken.uid;
    const statistics = await getPropertyStatistics(id, userId);

    if (!statistics) {
      return jsonApiError(404, 'STATISTICS_NOT_FOUND', 'Statistiques non trouvées ou accès non autorisé', {
        id,
      });
    }

    return NextResponse.json(statistics, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    if (error?.message === 'Accès non autorisé') {
      return jsonApiError(403, 'FORBIDDEN', 'Accès non autorisé');
    }

    return handleApiError(error, {
      logger,
      route: '/api/property/[id]/statistics',
      fallbackMessage: 'Internal server error',
    });
  }
}
