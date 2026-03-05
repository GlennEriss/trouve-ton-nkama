import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/firebase/admin';
import { createLogger } from '@/lib/logger';
import { assertStringField, handleApiError } from '@/lib/api/error-response';
import { AppError } from '@/lib/errors/app-error';

const logger = createLogger('api.auth.password-reset-request');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body || {};
    assertStringField(email, 'email', 'Email est requis');

    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/request-password-reset`,
      handleCodeInApp: false,
    };

    // Vérifier si l'utilisateur existe
    await adminAuth.getUserByEmail(email);

    // Générer le lien de réinitialisation
    const resetLink = await adminAuth.generatePasswordResetLink(
      email,
      actionCodeSettings
    );

    // Extraire l'oobCode du lien
    const url = new URL(resetLink);
    const oobCode = url.searchParams.get('oobCode');

    if (!oobCode) {
      throw new AppError('Impossible de générer le lien de réinitialisation', {
        code: 'PASSWORD_RESET_LINK_GENERATION_FAILED',
        status: 500,
      });
    }

    const params = new URLSearchParams();
    params.set('oobCode', oobCode);
    const customResetLink = `${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/api/auth/password-reset?${params.toString()}`;

    logger.info('Password reset request link generated', { email });
    return NextResponse.json({
      success: true,
      message: 'Email de réinitialisation envoyé avec succès',
      resetLink: customResetLink, // For tests/debug only
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/auth/password-reset-request',
      fallbackMessage: 'Erreur lors de la génération du lien de réinitialisation',
      knownCodes: {
        'auth/user-not-found': {
          status: 404,
          code: 'USER_NOT_FOUND',
          message: 'Aucun compte associé à cette adresse email',
        },
      },
    });
  }
}
