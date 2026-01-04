import { NextRequest, NextResponse } from 'next/server';
import { trackPropertyView, ViewMetadata } from '@/db/property-statistics.db';

/**
 * POST /api/property/[id]/statistics/view
 * Enregistre une vue sur une propriété (PUBLIC - accessible à tous)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

    // Récupérer les métadonnées optionnelles
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

    // Enregistrer la vue
    const success = await trackPropertyView(id, metadata);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to track view' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'View tracked successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error tracking property view:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

