import { NextRequest, NextResponse } from 'next/server';
import { trackPropertyInteraction, InteractionType } from '@/db/property-statistics.db';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import { resolveStatisticsActor } from '@/lib/server/statistics-actor';

const logger = createLogger('api.property.statistics.interaction');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Property ID is required', { field: 'id' });
    }

    const body = await request.json();
    const { type, metadata, visitorId } = body;

    if (!type) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Interaction type is required', { field: 'type' });
    }

    const validTypes: InteractionType[] = [
      'whatsapp_contact',
      'phone_contact',
      'whatsapp_share',
      'facebook_share',
      'native_share',
      'favorite_add',
      'favorite_remove',
      'map_click',
      'recommendation_click',
    ];

    if (!validTypes.includes(type)) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Invalid interaction type', {
        type,
      });
    }

    const actorId = resolveStatisticsActor(request, visitorId);
    const result = await trackPropertyInteraction(id, type as InteractionType, actorId, {
      ...metadata,
      userAgent: request.headers.get('user-agent') || undefined,
      referrer: request.headers.get('referer') || undefined,
    });

    if (result === 'not-found') {
      return jsonApiError(404, 'PROPERTY_NOT_FOUND', 'Property not found');
    }
    if (result === 'failed') {
      return jsonApiError(500, 'TRACK_INTERACTION_FAILED', 'Failed to track interaction');
    }

    return NextResponse.json({
      success: true,
      deduplicated: result === 'duplicate',
      message: 'Interaction tracked successfully',
    }, { status: 200 });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/property/[id]/statistics/interaction',
      fallbackMessage: 'Internal server error',
    });
  }
}
