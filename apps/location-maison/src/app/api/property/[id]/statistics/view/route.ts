import { NextRequest, NextResponse } from 'next/server';
import { trackPropertyView, ViewMetadata } from '@/db/property-statistics.db';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import { resolveStatisticsActor } from '@/lib/server/statistics-actor';

const logger = createLogger('api.property.statistics.view');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Property ID is required', { field: 'id' });
    }

    const body = await request.json().catch(() => ({}));
    const actorId = resolveStatisticsActor(request, body.visitorId);
    const metadata: ViewMetadata = {
      userId: actorId,
      duration: body.duration,
      scrollDepth: body.scrollDepth,
      imagesViewed: body.imagesViewed,
      province: body.province,
      city: body.city,
      userAgent: request.headers.get('user-agent') || undefined,
      referrer: request.headers.get('referer') || undefined,
    };

    const result = await trackPropertyView(id, actorId, metadata);

    if (result === 'not-found') {
      return jsonApiError(404, 'PROPERTY_NOT_FOUND', 'Property not found');
    }
    if (result === 'failed') {
      return jsonApiError(500, 'TRACK_VIEW_FAILED', 'Failed to track view');
    }

    return NextResponse.json({
      success: true,
      deduplicated: result === 'duplicate',
      message: 'View tracked successfully',
    }, { status: 200 });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/property/[id]/statistics/view',
      fallbackMessage: 'Internal server error',
    });
  }
}
