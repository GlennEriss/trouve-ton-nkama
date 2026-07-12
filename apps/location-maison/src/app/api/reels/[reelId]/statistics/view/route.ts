import { NextRequest, NextResponse } from 'next/server';
import { trackReelView } from '@/db/reel-statistics.db';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.reels.statistics.view');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reelId: string }> }
) {
  try {
    const { reelId } = await params;

    if (!reelId) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Reel ID is required', { field: 'reelId' });
    }

    const success = await trackReelView(reelId);

    if (!success) {
      return jsonApiError(500, 'TRACK_VIEW_FAILED', 'Failed to track view');
    }

    return NextResponse.json({ success: true, message: 'View tracked successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/reels/[reelId]/statistics/view',
      fallbackMessage: 'Internal server error',
    });
  }
}
