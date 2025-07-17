import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/firebase/admin';
import { render } from '@react-email/render';
import EmailVerification from '@/emails/EmailVerification';
import { emailService, EmailService } from '@/services/email.service';
import { EmailService as EmailTemplateService } from '@/emails/index';

export async function POST(request: NextRequest) {
  try {
    const { email, uid, subject, texts } = await request.json();

    if (!email && !uid) {
      return NextResponse.json(
        { error: 'Email ou UID est requis' },
        { status: 400 }
      );
    }

    try {
      // Récupérer l'utilisateur par son email ou UID
      const user = uid 
        ? await adminAuth.getUser(uid)
        : await adminAuth.getUserByEmail(email!);
      
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
      const userEmail = user.email || email || '';
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
      await emailService.sendEmail(emailData, verificationLink);
      
      return NextResponse.json({
        success: true,
        message: 'Email de vérification envoyé avec succès',
        ...(process.env.NODE_ENV === 'development' && { verificationLink }),
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
  // Ajouter un timestamp d'expiration (24 heures = 24 * 60 * 60 * 1000 ms)
  const expirationTime = Date.now() + (24 * 60 * 60 * 1000);
  params.set('expires', expirationTime.toString());
  return `${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/api/auth/verify-email?${params.toString()}`;
} 