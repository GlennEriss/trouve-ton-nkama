import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import GenericEmail from '@/emails/GenericEmail';
import PasswordReset from '@/emails/PasswordReset';
import EmailVerification from '@/emails/EmailVerification';
import { emailService, EmailService } from '@/services/email.service';
import { EmailService as EmailTemplateService } from '@/emails/index';
import { supportContact } from "@/constantes";
import { createLogger } from '@/lib/logger';

const logger = createLogger('api.test-email');

export async function POST(request: NextRequest) {
  try {
    const { email, templateType = 'reset', customTexts } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email est requis' },
        { status: 400 }
      );
    }

    // Validation simple de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      );
    }

    const name = email.split('@')[0];
    const testLink = `${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/test-link`;

    let emailHtml: string;
    let emailText: string;
    let subject: string;

    if (templateType === 'generic') {
      // Template générique pour tester le layout de base
      const genericTexts = customTexts || {
        title: 'Email de Test',
        subtitle: 'Trouve Ton Nkama',
        greeting: 'Bonjour',
        mainMessage: 'Ceci est un email de test pour vérifier l\'affichage du logo et la mise en page. Tous les éléments visuels devraient s\'afficher correctement dans votre client email.',
        buttonText: 'Visiter Trouve Ton Nkama',
        footerMessage: 'Cet email a été envoyé pour tester l\'affichage des templates.',
        additionalInfo: 'Email de test - aucune action requise.',
        copyRight: '© 2024 Trouve Ton Nkama. Tous droits réservés.',
        supportEmail: supportContact.email,
        websiteUrl: process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000',
        visitSocialNetworks: 'Suivez-nous sur nos réseaux sociaux',
      };

      // Utilise le composant GenericEmail dédié
      emailHtml = await render(
        GenericEmail({
          name,
          email,
          actionLink: testLink,
          texts: genericTexts,
        })
      );

      emailText = await render(
        GenericEmail({
          name,
          email,
          actionLink: testLink,
          texts: genericTexts,
        }),
        { plainText: true }
      );

      subject = 'Test - Email Générique - Trouve Ton Nkama';
    } else if (templateType === 'verification') {
      // Template de vérification d'email
      const emailProps = EmailTemplateService.generateEmailVerificationProps(
        name,
        email,
        testLink,
        customTexts
      );

      emailHtml = await render(
        EmailVerification(emailProps)
      );

      emailText = await render(
        EmailVerification(emailProps),
        { plainText: true }
      );

      subject = 'Test - Confirmez votre adresse email - Trouve Ton Nkama';
    } else {
      // Template de réinitialisation (par défaut)
      const emailProps = EmailTemplateService.generatePasswordResetProps(
        name,
        email,
        testLink,
        customTexts
      );

      emailHtml = await render(
        PasswordReset(emailProps)
      );

      emailText = await render(
        PasswordReset(emailProps),
        { plainText: true }
      );

      subject = 'Test - Réinitialisez votre mot de passe - Trouve Ton Nkama';
    }

    // Données de l'email
    const emailData = {
      from: EmailService.getDefaultFromAddress(),
      to: email,
      subject,
      text: emailText,
      html: emailHtml,
    };

    // Envoyer l'email avec le service centralisé
    await emailService.sendEmail(emailData, testLink);

    return NextResponse.json({
      success: true,
      message: `Email de test (${templateType}) envoyé avec succès à ${email}`,
      details: {
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        templateType,
        timestamp: new Date().toISOString(),
      },
      // En mode développement, on peut voir le HTML généré
      ...(process.env.NODE_ENV === 'development' && { 
        testLink,
        htmlPreview: emailHtml.substring(0, 500) + '...' 
      }),
    });

  } catch (error: any) {
    logger.error('Erreur lors de l\'envoi de l\'email de test', { error });
    
    // Gestion des erreurs d'email service
    if (error.message && error.message.includes('Gmail API')) {
      return NextResponse.json(
        { 
          error: 'Erreur de configuration Gmail. Vérifiez les variables d\'environnement.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 }
      );
    }

    if (error.message && error.message.includes('ENOTFOUND')) {
      return NextResponse.json(
        { error: 'Erreur de connexion réseau. Vérifiez votre connexion internet.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'envoi de l\'email de test',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// GET pour obtenir les informations sur l'API
export async function GET() {
  return NextResponse.json({
    message: 'API de test d\'envoi d\'emails',
    usage: {
      method: 'POST',
      body: {
        email: 'string (requis) - Adresse email de destination',
        templateType: 'string (optionnel) - "reset", "verification" ou "generic" (défaut: "reset")',
        customTexts: 'object (optionnel) - Textes personnalisés pour l\'email'
      },
      examples: [
        {
          description: 'Test email de réinitialisation',
          body: {
            email: 'test@example.com',
            templateType: 'reset'
          }
        },
        {
          description: 'Test email de vérification',
          body: {
            email: 'test@example.com',
            templateType: 'verification'
          }
        },
      ]
    }
  });
} 
