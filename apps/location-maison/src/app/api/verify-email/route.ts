import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json(
        { error: 'UID utilisateur requis' },
        { status: 400 }
      );
    }

    try {
      // Récupérer l'utilisateur par son UID
      const user = await adminAuth.getUser(uid);

      return NextResponse.json({
        success: true,
        emailVerified: user.emailVerified,
      });
    } catch (error: any) {
      console.error('Erreur lors de la vérification du statut de l\'email:', error);
      
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'Utilisateur non trouvé' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erreur lors de la vérification du statut de l\'email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erreur générale:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 