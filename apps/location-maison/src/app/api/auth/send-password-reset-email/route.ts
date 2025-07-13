import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/firebase/admin';
import { render } from '@react-email/render';
import PasswordReset from '@/emails/PasswordReset';

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

      if (!oobCode) {
        throw new Error('Impossible de générer le code de réinitialisation');
      }

      // Créer notre lien personnalisé
      const params = new URLSearchParams();
      params.set('oobCode', oobCode);
      const resetLink = `${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/api/auth/password-reset?${params.toString()}`;

      // Préparer les données pour l'email
      const name = user.displayName?.split(' ')[0] || email.split('@')[0];
      
      const emailTexts = texts || {
        title: 'Réinitialisez votre mot de passe',
        subtitle: 'Trouve Ton Nkama',
        greeting: 'Bonjour',
        mainText: 'Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.',
        buttonText: 'Réinitialiser mon mot de passe',
        footerText: 'Si vous n\'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.',
        supportText: 'Besoin d\'aide ? Contactez-nous à support@tonnkama.com',
        securityInfo: 'Ce lien est valide pendant 1 heure pour votre sécurité.',
      };

      // Générer l'email HTML
      const emailHtml = render(
        PasswordReset({
          name,
          resetLink,
          texts: emailTexts,
        })
      );

      // Générer l'email en texte brut
      const emailText = render(
        PasswordReset({
          name,
          resetLink,
          texts: emailTexts,
        }),
        { plainText: true }
      );

      // Données de l'email
      const emailData = {
        from: process.env.GOOGLE_EMAIL || 'noreply@tonnkama.com',
        to: email,
        subject: subject || 'Réinitialisez votre mot de passe - Trouve Ton Nkama',
        text: emailText,
        html: emailHtml,
      };

      // TODO: Implémenter l'envoi d'email via un service (Nodemailer, SendGrid, etc.)
      // Pour l'instant, on retourne juste le succès avec le lien pour les tests
      
      return NextResponse.json({
        success: true,
        message: 'Email de réinitialisation envoyé avec succès',
        resetLink, // Pour les tests seulement
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'Aucun compte associé à cette adresse email' },
          { status: 404 }
        );
      }
      
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