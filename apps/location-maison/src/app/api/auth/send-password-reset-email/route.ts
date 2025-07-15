import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/firebase/admin';
import { render } from '@react-email/render';
import PasswordReset from '@/emails/PasswordReset';
import { emailService, EmailService as EmailTransportService } from '@/services/email.service';
import { EmailService as EmailTemplateService } from '@/emails/index';

export async function POST(request: NextRequest) {
  try {
    const { email, subject, texts } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email est requis' },
        { status: 400 }
      );
    }

    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/request-password-reset`,
      handleCodeInApp: false,
    };

    try {
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

      console.log('🔍 Lien Firebase original:', firebaseResetLink);
      console.log('🔍 oobCode extrait:', oobCode);

      if (!oobCode) {
        throw new Error('Impossible de générer le code de réinitialisation');
      }

      // Créer notre lien personnalisé
      const params = new URLSearchParams();
      params.set('oobCode', oobCode);
      const resetLink = `${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/api/auth/password-reset?${params.toString()}`;
      
      console.log('🔍 Lien personnalisé généré:', resetLink);

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
        from: EmailTransportService.getDefaultFromAddress(),
        to: email,
        subject: subject || 'Réinitialisez votre mot de passe - Trouve Ton Nkama',
        text: emailText,
        html: emailHtml,
      };

      // Envoyer l'email avec le service centralisé
      await emailService.sendEmail(emailData, resetLink);
      
      return NextResponse.json({
        success: true,
        message: 'Email de réinitialisation envoyé avec succès',
        ...(process.env.NODE_ENV === 'development' && { resetLink }),
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      
      // Gestion spécifique des erreurs Firebase Auth
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'Aucun compte associé à cette adresse email' },
          { status: 404 }
        );
      }
      
      if (error.code === 'auth/invalid-email') {
        return NextResponse.json(
          { error: 'Adresse email invalide' },
          { status: 400 }
        );
      }
      
      if (error.code === 'auth/user-disabled') {
        return NextResponse.json(
          { error: 'Ce compte a été désactivé. Veuillez contacter le support.' },
          { status: 403 }
        );
      }
      
      // Gestion de l'erreur RESET_PASSWORD_EXCEED_LIMIT
      if (error.message && error.message.includes('RESET_PASSWORD_EXCEED_LIMIT')) {
        return NextResponse.json(
          { 
            error: 'Trop de tentatives de réinitialisation. Veuillez attendre quelques minutes avant de réessayer.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: 300 // 5 minutes en secondes
          },
          { status: 429 }
        );
      }
      
      // Gestion des erreurs de quota/limite
      if (error.message && (
        error.message.includes('QUOTA_EXCEEDED') ||
        error.message.includes('RATE_LIMITED')
      )) {
        return NextResponse.json(
          { 
            error: 'Service temporairement indisponible. Veuillez réessayer dans quelques minutes.',
            code: 'SERVICE_UNAVAILABLE'
          },
          { status: 503 }
        );
      }
      
      // Log détaillé pour les autres erreurs
      console.error('Erreur Firebase Auth détaillée:', {
        code: error.code,
        message: error.message,
        details: error.errorInfo || error
      });
      
      return NextResponse.json(
        { error: 'Erreur lors de l\'envoi de l\'email de réinitialisation' },
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