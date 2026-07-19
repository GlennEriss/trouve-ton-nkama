import { NextRequest, NextResponse } from 'next/server';
import { trackReelShare } from '@/db/reel-statistics.db';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import { attachRequestId, createRequestLogContext } from '@/lib/observability/request-context';
import { resolveStatisticsActor } from '@/lib/server/statistics-actor';

const ALLOWED_SHARE_TARGETS = new Set(['native', 'whatsapp', 'facebook', 'x', 'mail', 'tiktok', 'copy']);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reelId: string }> }
) {
  const requestContext = createRequestLogContext(request, 'reel.statistics.share', 'reel_lifecycle');
  const logger = createLogger('api.reels.statistics.share', requestContext);
  const respond = (response: Response): Response => attachRequestId(response, requestContext.requestId);

  try {
    const { reelId } = await params;

    if (!reelId) {
      return respond(jsonApiError(400, 'VALIDATION_ERROR', 'Reel ID is required', { field: 'reelId' }));
    }

    const body = await request.json().catch(() => null) as { target?: unknown; visitorId?: unknown } | null;
    const rawTarget = typeof body?.target === 'string' ? body.target.trim().toLowerCase() : '';
    const target = ALLOWED_SHARE_TARGETS.has(rawTarget) ? rawTarget : undefined;
    const actorId = resolveStatisticsActor(request, body?.visitorId);
    const result = await trackReelShare(reelId, target, actorId);

    if (result === 'not-found') {
      return respond(jsonApiError(404, 'REEL_NOT_FOUND', 'Reel not found'));
    }
    if (result === 'failed') {
      return respond(jsonApiError(500, 'TRACK_SHARE_FAILED', 'Failed to track share'));
    }

    return respond(NextResponse.json({
      success: true,
      deduplicated: result === 'duplicate',
      message: 'Share tracked successfully',
    }, { status: 200 }));
  } catch (error) {
    return respond(handleApiError(error, {
      logger,
      route: '/api/reels/[reelId]/statistics/share',
      fallbackMessage: 'Internal server error',
    }));
  }
}
