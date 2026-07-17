import { NextRequest, NextResponse } from 'next/server';
import { trackReelLike } from '@/db/reel-statistics.db';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.reels.statistics.like');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reelId: string }> }
) {
  try {
    const { reelId } = await params;

    if (!reelId) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Reel ID is required', { field: 'reelId' });
    }

    const body = await request.json().catch(() => null) as { liked?: unknown } | null;
    if (!body || typeof body.liked !== 'boolean') {
      return jsonApiError(400, 'VALIDATION_ERROR', 'liked must be a boolean', { field: 'liked' });
    }

    const success = await trackReelLike(reelId, body.liked);

    if (!success) {
      return jsonApiError(500, 'TRACK_LIKE_FAILED', 'Failed to track like');
    }

    return NextResponse.json({ success: true, message: 'Like tracked successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/reels/[reelId]/statistics/like',
      fallbackMessage: 'Internal server error',
    });
  }
}
