import { NextRequest, NextResponse } from 'next/server';
import { trackPropertyView, ViewMetadata } from '@/db/property-statistics.db';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

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
    const metadata: ViewMetadata = {
      userId: body.userId,
      duration: body.duration,
      scrollDepth: body.scrollDepth,
      imagesViewed: body.imagesViewed,
      province: body.province,
      city: body.city,
      userAgent: request.headers.get('user-agent') || undefined,
      referrer: request.headers.get('referer') || undefined,
    };

    const success = await trackPropertyView(id, metadata);

    if (!success) {
      return jsonApiError(500, 'TRACK_VIEW_FAILED', 'Failed to track view');
    }

    return NextResponse.json({ success: true, message: 'View tracked successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/property/[id]/statistics/view',
      fallbackMessage: 'Internal server error',
    });
  }
}
