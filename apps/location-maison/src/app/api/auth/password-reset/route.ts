import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { assertStringField, handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.auth.password-reset');

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const oobCode = params.get('oobCode');

  logger.debug('Password reset link visited', {
    hasOobCode: !!oobCode,
  });

  if (!oobCode) {
    logger.warn('Password reset link missing oobCode');
    const redirectUrl = new URL('/password-reset-failure', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirection directe vers la page de réinitialisation
  // La validation du code OOB se fera lors de la soumission du nouveau mot de passe
  logger.info('Redirecting to password reset page');
  const newParams = new URLSearchParams();
  newParams.set('oobCode', oobCode);
  const redirectUrl = new URL(`/password-reset?${newParams.toString()}`, request.url);
  return NextResponse.redirect(redirectUrl);
}

export async function POST(request: NextRequest) {
  try {
    const { adminAuth } = await import('@/firebase/admin');

    const body = await request.json();
    const { newPassword, oobCode } = body || {};
    assertStringField(newPassword, 'newPassword', 'Mot de passe et code OOB sont requis');
    assertStringField(oobCode, 'oobCode', 'Mot de passe et code OOB sont requis');

    try {
      // Réinitialiser directement le mot de passe
      // Firebase validera automatiquement le code OOB
      const confirmResponse = await confirmPasswordReset(oobCode, newPassword);
      const confirmResult = (await confirmResponse.json()) as {
        error?: { message?: string };
        email?: string;
      };

      if (confirmResult.error) {
        throw new Error(confirmResult.error.message);
      }

      const resetEmail = typeof confirmResult.email === 'string' ? confirmResult.email : '';
      if (resetEmail) {
        try {
          const { accountActivityNotificationServerService } = await import(
            '@/features/users/account-activity-notifications'
          );
          const userRecord = await adminAuth.getUserByEmail(resetEmail);
          await accountActivityNotificationServerService.dispatch({
            uid: userRecord.uid,
            eventType: 'ACCOUNT_PASSWORD_CHANGED',
            eventId: `password-reset:${userRecord.uid}:${Date.now()}`,
            context: {
              source: 'api.auth.password-reset',
              actionUrl: '/login-and-security',
            },
          });
        } catch (activityError) {
          logger.warn('Password reset activity notification failed', {
            resetEmail,
            error: activityError,
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      logger.warn('Password reset confirmation failed', {
        message,
        error,
      });

      if (message.includes('EXPIRED_OOB_CODE')) {
        return jsonApiError(400, 'EXPIRED_OOB_CODE', 'Le lien de réinitialisation a expiré');
      }

      if (message.includes('INVALID_OOB_CODE')) {
        return jsonApiError(400, 'INVALID_OOB_CODE', 'Le lien de réinitialisation est invalide');
      }

      if (message.includes('WEAK_PASSWORD')) {
        return jsonApiError(400, 'WEAK_PASSWORD', 'Le mot de passe est trop faible');
      }

      return jsonApiError(500, 'PASSWORD_RESET_FAILED', 'Erreur lors de la réinitialisation du mot de passe');
    }
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/auth/password-reset',
      fallbackMessage: 'Erreur interne du serveur',
    });
  }
}



async function confirmPasswordReset(oobCode: string, newPassword: string) {
  const params = new URLSearchParams();
  params.set('key', process.env.NEXT_PUBLIC_FIREBASE_API_KEY!);
  
  return await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ oobCode, newPassword }),
    }
  );
} 
