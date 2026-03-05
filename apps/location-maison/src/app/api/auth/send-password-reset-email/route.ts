import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/firebase/admin';
import { render } from '@react-email/render';
import PasswordReset from '@/emails/PasswordReset';
import { emailService, EmailService } from '@/services/email.service';
import { EmailService as EmailTemplateService } from '@/emails/index';
import { createLogger } from '@/lib/logger';
import { assertStringField, handleApiError, jsonApiError } from '@/lib/api/error-response';
import { AppError } from '@/lib/errors/app-error';

const logger = createLogger('api.auth.send-password-reset-email');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, subject, texts } = body || {};
    assertStringField(email, 'email', 'Email est requis');

    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/request-password-reset`,
      handleCodeInApp: false,
    };

    // Récupérer l'utilisateur par son email
    const user = await adminAuth.getUserByEmail(email);

    // Générer le lien de réinitialisation Firebase
    const firebaseResetLink = await adminAuth.generatePasswordResetLink(
      email,
      actionCodeSettings
    );

    // Extraire l'oobCode du lien Firebase
    const url = new URL(firebaseResetLink);
    const oobCode = url.searchParams.get('oobCode');
    logger.debug('Password reset oobCode extracted', {
      email,
      hasOobCode: !!oobCode,
    });

    if (!oobCode) {
      throw new AppError('Impossible de générer le code de réinitialisation', {
        code: 'PASSWORD_RESET_LINK_GENERATION_FAILED',
        status: 500,
      });
    }

    // Créer notre lien personnalisé
    const params = new URLSearchParams();
    params.set('oobCode', oobCode);
    const resetLink = `${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/api/auth/password-reset?${params.toString()}`;

    // Préparer les données pour l'email
    const name = user.displayName?.split(' ')[0] || email.split('@')[0];

    // Utiliser les textes par défaut du EmailService qui incluent expirationInfo
    const emailProps = EmailTemplateService.generatePasswordResetProps(
      name,
      email,
      resetLink,
      texts
    );

    // Générer l'email HTML
    const emailHtml = await render(
      PasswordReset(emailProps)
    );

    // Générer l'email en texte brut
    const emailText = await render(
      PasswordReset(emailProps),
      { plainText: true }
    );

    // Données de l'email
    const emailData = {
      from: EmailService.getDefaultFromAddress(),
      to: email,
      subject: subject || 'Réinitialisez votre mot de passe - Trouve Ton Nkama',
      text: emailText,
      html: emailHtml,
    };

    // Envoyer l'email avec le service centralisé
    await emailService.sendEmail(emailData, resetLink);

    logger.info('Password reset email sent', { email });
    return NextResponse.json({
      success: true,
      message: 'Email de réinitialisation envoyé avec succès',
      ...(process.env.NODE_ENV === 'development' && { resetLink }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('RESET_PASSWORD_EXCEED_LIMIT')) {
      logger.warn('Password reset rate limit exceeded', { error });
      return jsonApiError(
        429,
        'RATE_LIMIT_EXCEEDED',
        'Trop de tentatives de réinitialisation. Veuillez attendre quelques minutes avant de réessayer.',
        { retryAfter: 300 }
      );
    }

    if (message.includes('QUOTA_EXCEEDED') || message.includes('RATE_LIMITED')) {
      logger.warn('Password reset provider quota exceeded', { error });
      return jsonApiError(
        503,
        'SERVICE_UNAVAILABLE',
        'Service temporairement indisponible. Veuillez réessayer dans quelques minutes.'
      );
    }

    return handleApiError(error, {
      logger,
      route: '/api/auth/send-password-reset-email',
      fallbackMessage: 'Erreur lors de l\'envoi de l\'email de réinitialisation',
      knownCodes: {
        'auth/user-not-found': {
          status: 404,
          code: 'USER_NOT_FOUND',
          message: 'Aucun compte associé à cette adresse email',
        },
        'auth/invalid-email': {
          status: 400,
          code: 'INVALID_EMAIL',
          message: 'Adresse email invalide',
        },
        'auth/user-disabled': {
          status: 403,
          code: 'USER_DISABLED',
          message: 'Ce compte a été désactivé. Veuillez contacter le support.',
        },
      },
    });
  }
}
