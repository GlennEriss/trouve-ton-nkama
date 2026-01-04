import { NextRequest, NextResponse } from 'next/server';
import { trackPropertyInteraction, InteractionType } from '@/db/property-statistics.db';

/**
 * POST /api/property/[id]/statistics/interaction
 * Enregistre une interaction sur une propriété (PUBLIC - accessible à tous)
 * Types d'interactions : whatsapp_contact, phone_contact, whatsapp_share, facebook_share, etc.
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

    const body = await request.json();
    const { type, metadata } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Interaction type is required' },
        { status: 400 }
      );
    }

    // Valider le type d'interaction
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
      return NextResponse.json(
        { error: 'Invalid interaction type' },
        { status: 400 }
      );
    }

    // Enregistrer l'interaction
    const success = await trackPropertyInteraction(
      id,
      type as InteractionType,
      {
        ...metadata,
        userAgent: request.headers.get('user-agent') || undefined,
        referrer: request.headers.get('referer') || undefined,
      }
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to track interaction' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Interaction tracked successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error tracking property interaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

