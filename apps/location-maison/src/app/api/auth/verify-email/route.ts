import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/firebase/admin';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const uid = params.get('uid');
  const expires = params.get('expires');

  if (!uid) {
    return NextResponse.json(
      { error: 'UID utilisateur requis' },
      { status: 400 }
    );
  }

  // Vérifier l'expiration du lien
  if (expires) {
    const expirationTime = parseInt(expires);
    const currentTime = Date.now();
    
    if (currentTime > expirationTime) {
      // Lien expiré - rediriger vers une page d'expiration
      const redirectUrl = new URL('/email-verification-expired', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  } else {
    // Pas d'expiration spécifiée (anciens liens) - considérer comme expiré
    const redirectUrl = new URL('/email-verification-expired', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Récupérer l'utilisateur par son UID
    const user = await adminAuth.getUser(uid);

    if (user.emailVerified) {
      // L'email est déjà vérifié, rediriger vers la page appropriée
      const redirectUrl = new URL('/email-already-verified', request.url);
      return NextResponse.redirect(redirectUrl);
    } else {
      // Marquer l'email comme vérifié
      await adminAuth.updateUser(uid, {
        emailVerified: true,
      });

      // Rediriger vers la page de succès
      const redirectUrl = new URL('/email-verification-success', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error: any) {
    console.error('Erreur lors de la vérification de l\'email:', error);
    
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de l\'email' },
      { status: 500 }
    );
  }
}

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

      if (user.emailVerified) {
        return NextResponse.json({
          success: true,
          message: 'Email déjà vérifié',
          alreadyVerified: true,
        });
      } else {
        // Pour l'API POST, ne pas vérifier l'expiration car c'est utilisé 
        // pour la vérification manuelle du statut
        // Marquer l'email comme vérifié
        await adminAuth.updateUser(uid, {
          emailVerified: true,
        });

        return NextResponse.json({
          success: true,
          message: 'Email vérifié avec succès',
          alreadyVerified: false,
        });
      }
    } catch (error: any) {
      console.error('Erreur lors de la vérification de l\'email:', error);
      
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'Utilisateur non trouvé' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erreur lors de la vérification de l\'email' },
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