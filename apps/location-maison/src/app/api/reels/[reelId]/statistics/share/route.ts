import { NextRequest, NextResponse } from 'next/server';
import { trackReelShare } from '@/db/reel-statistics.db';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.reels.statistics.share');
const ALLOWED_SHARE_TARGETS = new Set(['native', 'whatsapp', 'facebook', 'x', 'mail', 'tiktok', 'copy']);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reelId: string }> }
) {
  try {
    const { reelId } = await params;

    if (!reelId) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Reel ID is required', { field: 'reelId' });
    }

    const body = await request.json().catch(() => null) as { target?: unknown } | null;
    const rawTarget = typeof body?.target === 'string' ? body.target.trim().toLowerCase() : '';
    const target = ALLOWED_SHARE_TARGETS.has(rawTarget) ? rawTarget : undefined;
    const success = await trackReelShare(reelId, target);

    if (!success) {
      return jsonApiError(500, 'TRACK_SHARE_FAILED', 'Failed to track share');
    }

    return NextResponse.json({ success: true, message: 'Share tracked successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/reels/[reelId]/statistics/share',
      fallbackMessage: 'Internal server error',
    });
  }
}
