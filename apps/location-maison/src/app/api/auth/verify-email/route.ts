import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/firebase/admin';
import { createLogger } from '@/lib/logger';
import { assertStringField, handleApiError } from '@/lib/api/error-response';
import { ValidationError } from '@/lib/errors/app-error';

const logger = createLogger('api.auth.verify-email');

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const uid = params.get('uid');
    const expires = params.get('expires');

    if (!uid) {
      throw new ValidationError('UID utilisateur requis', { field: 'uid' });
    }

    // Vérifier l'expiration du lien
    if (expires) {
      const expirationTime = parseInt(expires, 10);
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
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/auth/verify-email:GET',
      fallbackMessage: 'Erreur lors de la vérification de l\'email',
      knownCodes: {
        'auth/user-not-found': {
          status: 404,
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid } = body || {};
    assertStringField(uid, 'uid', 'UID utilisateur requis');

    // Récupérer l'utilisateur par son UID
    const user = await adminAuth.getUser(uid);

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email déjà vérifié',
        alreadyVerified: true,
      });
    }

    // Pour l'API POST, ne pas vérifier l'expiration car c'est utilisé
    // pour la vérification manuelle du statut
    await adminAuth.updateUser(uid, {
      emailVerified: true,
    });

    logger.info('Email marked as verified', { uid });
    return NextResponse.json({
      success: true,
      message: 'Email vérifié avec succès',
      alreadyVerified: false,
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/auth/verify-email:POST',
      fallbackMessage: 'Erreur lors de la vérification de l\'email',
      knownCodes: {
        'auth/user-not-found': {
          status: 404,
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      },
    });
  }
}
