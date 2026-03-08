import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import EmailVerification from '@/emails/EmailVerification';
import { emailService, EmailService } from '@/services/email.service';
import { EmailService as EmailTemplateService } from '@/emails/index';
import { createLogger } from '@/lib/logger';
import { handleApiError, assertStringField } from '@/lib/api/error-response';
import { ValidationError } from '@/lib/errors/app-error';

const logger = createLogger('api.auth.send-verification-email');

export async function POST(request: NextRequest) {
  try {
    const { adminAuth } = await import('@/firebase/admin');

    const body = await request.json();
    const { email, uid, subject, texts } = body || {};

    if (!email && !uid) {
      throw new ValidationError('Email ou UID est requis', {
        expected: ['email', 'uid'],
      });
    }

    if (!uid) {
      assertStringField(email, 'email', 'Email est requis');
    }

    // Récupérer l'utilisateur par son email ou UID
    const user = uid
      ? await adminAuth.getUser(uid)
      : await adminAuth.getUserByEmail(email);

    if (user.emailVerified) {
      return NextResponse.json({
        success: false,
        message: 'Email déjà vérifié',
        alreadyVerified: true,
      });
    }

    // Générer le lien de vérification
    const verificationLink = generateEmailVerificationLink(user.uid);

    // Préparer les données pour l'email
    const fallbackEmail = typeof email === 'string' ? email : '';
    const userEmail = user.email || fallbackEmail;
    const name = user.displayName?.split(' ')[0] || (userEmail ? userEmail.split('@')[0] : 'Utilisateur');

    // Utiliser les textes par défaut du EmailService qui incluent expirationInfo
    const emailProps = EmailTemplateService.generateEmailVerificationProps(
      name,
      userEmail,
      verificationLink,
      texts
    );

    // Générer l'email HTML
    const emailHtml = await render(
      EmailVerification(emailProps)
    );

    // Générer l'email en texte brut
    const emailText = await render(
      EmailVerification(emailProps),
      { plainText: true }
    );

    // Données de l'email
    const emailData = {
      from: EmailService.getDefaultFromAddress(),
      to: userEmail,
      subject: subject || 'Vérifiez votre adresse email - Trouve Ton Nkama',
      text: emailText,
      html: emailHtml,
    };

    // Envoyer l'email avec le service centralisé
    const emailSendResult = await emailService.sendEmail(emailData, verificationLink);

    logger.info('Verification email sent', {
      uid: user.uid,
      email: userEmail,
      simulated: emailSendResult.simulated,
      messageId: emailSendResult.messageId,
      acceptedCount: emailSendResult.accepted.length,
      rejectedCount: emailSendResult.rejected.length,
      rejected: emailSendResult.rejected,
    });

    return NextResponse.json({
      success: true,
      message: 'Email de vérification envoyé avec succès',
      ...(process.env.NODE_ENV === 'development' && { verificationLink }),
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/auth/send-verification-email',
      fallbackMessage: 'Erreur lors de l\'envoi de l\'email de vérification',
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

function generateEmailVerificationLink(uid: string): string {
  const params = new URLSearchParams();
  params.set('uid', uid);
  // Ajouter un timestamp d'expiration (24 heures = 24 * 60 * 60 * 1000 ms)
  const expirationTime = Date.now() + (24 * 60 * 60 * 1000);
  params.set('expires', expirationTime.toString());
  return `${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/api/auth/verify-email?${params.toString()}`;
} 
