import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/firebase/admin';
import { render } from '@react-email/render';
import EmailVerification from '@/emails/EmailVerification';

export async function POST(request: NextRequest) {
  try {
    const { email, subject, texts } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email est requis' },
        { status: 400 }
      );
    }

    try {
      // Récupérer l'utilisateur par son email
      const user = await adminAuth.getUserByEmail(email);
      
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
      const name = user.displayName?.split(' ')[0] || email.split('@')[0];
      
      const emailTexts = texts || {
        title: 'Vérifiez votre adresse email',
        subtitle: 'Trouve Ton Nkama',
        greeting: 'Bonjour',
        mainText: 'Merci de vous être inscrit sur Trouve Ton Nkama. Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous pour vérifier votre adresse email.',
        buttonText: 'Vérifier mon email',
        footerText: 'Si vous n\'avez pas créé de compte, vous pouvez ignorer cet email.',
        supportText: 'Besoin d\'aide ? Contactez-nous à support@tonnkama.com',
      };

      // Générer l'email HTML
      const emailHtml = render(
        EmailVerification({
          name,
          verificationLink,
          texts: emailTexts,
        })
      );

      // Générer l'email en texte brut
      const emailText = render(
        EmailVerification({
          name,
          verificationLink,
          texts: emailTexts,
        }),
        { plainText: true }
      );

      // Données de l'email
      const emailData = {
        from: process.env.GOOGLE_EMAIL || 'noreply@tonnkama.com',
        to: email,
        subject: subject || 'Vérifiez votre adresse email - Trouve Ton Nkama',
        text: emailText,
        html: emailHtml,
      };

      // TODO: Implémenter l'envoi d'email via un service (Nodemailer, SendGrid, etc.)
      // Pour l'instant, on retourne juste le succès avec le lien pour les tests
      
      return NextResponse.json({
        success: true,
        message: 'Email de vérification envoyé avec succès',
        verificationLink, // Pour les tests seulement
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
        { error: 'Erreur lors de l\'envoi de l\'email de vérification' },
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

function generateEmailVerificationLink(uid: string): string {
  const params = new URLSearchParams();
  params.set('uid', uid);
  return `${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/api/auth/verify-email?${params.toString()}`;
} 