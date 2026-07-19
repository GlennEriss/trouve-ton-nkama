import { NextRequest, NextResponse } from 'next/server';
import { trackReelLike } from '@/db/reel-statistics.db';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import { attachRequestId, createRequestLogContext } from '@/lib/observability/request-context';
import { resolveStatisticsActor } from '@/lib/server/statistics-actor';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reelId: string }> }
) {
  const requestContext = createRequestLogContext(request, 'reel.statistics.like', 'reel_lifecycle');
  const logger = createLogger('api.reels.statistics.like', requestContext);
  const respond = (response: Response): Response => attachRequestId(response, requestContext.requestId);

  try {
    const { reelId } = await params;

    if (!reelId) {
      return respond(jsonApiError(400, 'VALIDATION_ERROR', 'Reel ID is required', { field: 'reelId' }));
    }

    const body = await request.json().catch(() => null) as { liked?: unknown; visitorId?: unknown } | null;
    if (!body || typeof body.liked !== 'boolean') {
      return respond(jsonApiError(400, 'VALIDATION_ERROR', 'liked must be a boolean', { field: 'liked' }));
    }

    const actorId = resolveStatisticsActor(request, body.visitorId);
    const result = await trackReelLike(reelId, body.liked, actorId);

    if (result === 'not-found') {
      return respond(jsonApiError(404, 'REEL_NOT_FOUND', 'Reel not found'));
    }
    if (result === 'failed') {
      return respond(jsonApiError(500, 'TRACK_LIKE_FAILED', 'Failed to track like'));
    }

    return respond(NextResponse.json({
      success: true,
      deduplicated: result === 'duplicate',
      message: 'Like tracked successfully',
    }, { status: 200 }));
  } catch (error) {
    return respond(handleApiError(error, {
      logger,
      route: '/api/reels/[reelId]/statistics/like',
      fallbackMessage: 'Internal server error',
    }));
  }
}
