import { NextRequest, NextResponse } from 'next/server';
import { getPropertyStatistics } from '@/db/property-statistics.db';
import { adminAuth } from '@/firebase/admin';

/**
 * GET /api/property/[id]/statistics
 * Récupère les statistiques complètes d'une propriété (PROTECTED - uniquement pour le propriétaire)
 */
export async function GET(
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

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification requis' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Vérifier le token Firebase
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // Récupérer les statistiques (vérification de propriétaire incluse dans la fonction)
    const statistics = await getPropertyStatistics(id, userId);

    if (!statistics) {
      return NextResponse.json(
        { error: 'Statistiques non trouvées ou accès non autorisé' },
        { status: 404 }
      );
    }

    return NextResponse.json(statistics, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('Error fetching property statistics:', error);
    
    if (error.message === 'Accès non autorisé') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

