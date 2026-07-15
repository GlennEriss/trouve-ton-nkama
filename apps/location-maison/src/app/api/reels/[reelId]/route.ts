import { NextResponse } from 'next/server';
import { getPublicReelById } from '@/db/reel.db';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.reels.byId');

/** Un réel public par id — lien profond (ex. partagé via WhatsApp). Pas de cache : trafic
 * faible, fraîcheur préférable à la performance ici (contrairement à /api/reels/feed). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ reelId: string }> },
) {
  try {
    const { reelId } = await params;
    if (!reelId) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Reel ID is required');
    }

    const reel = await getPublicReelById(reelId);
    if (!reel) {
      return jsonApiError(404, 'NOT_FOUND', 'Réel introuvable');
    }

    return NextResponse.json({ reel });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/reels/[reelId]',
      fallbackMessage: 'Failed to fetch reel',
    });
  }
}
