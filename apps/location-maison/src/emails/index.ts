// Import du logo Base64
import { LOGO_BASE64 } from './logo-base64';
import { supportContact } from '../constantes';
import { EmailVerificationProps } from './types';

// Export des templates d'emails
export { default as GenericEmail } from './GenericEmail';
export { default as EmailVerification } from './EmailVerification';
export { LOGO_BASE64 } from './logo-base64';
export { default as PasswordReset } from './PasswordReset';
export { default as WelcomeEmail } from './WelcomeEmail';
export { default as PropertyPublished } from './PropertyPublished';
export { default as Layout } from './Layout';

// Export des types
export * from './types';

// Export du thème
export { default as theme } from './theme';

// Utilitaires pour l'envoi d'emails
export class EmailService {
  /**
   * Configurations par défaut pour les emails
   */
  static defaultConfig = {
    from: 'noreply@tonnkama.com',
    replyTo: supportContact.email,
    supportEmail: supportContact.email,
    websiteUrl: 'https://tonnkama.com',
    //unsubscribeUrl: 'https://tonnkama.com/unsubscribe',
  };

  static validateEmailInput(emailData: { to: string; subject: string }) {
    const { to, subject } = emailData;

    if (!to || !subject) {
      throw new Error('Email "to" and "subject" are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error('Invalid email format');
    }

    return true;
  }

  // Send verification email
  static async sendEmailVerificationLink(emailData: EmailVerificationProps) {
    try {
      this.validateEmailInput({ to: emailData.email, subject: 'Vérification email' });

      const { render } = await import('@react-email/render');
      const { default: EmailVerification } = await import('./EmailVerification');

      const emailConfig = {
        ...this.defaultConfig,
        supportEmail: supportContact.email,
      };

      // ... existing code ...
    } catch (error) {
      console.error('Error sending email verification link:', error);
      throw error;
    }
  }

  /**
   * Textes par défaut en français pour les emails
   */
  static defaultTexts = {
    // Textes communs
    greeting: 'Bonjour',
    copyRight: `© ${new Date().getFullYear()} Trouve Ton Nkama. Tous droits réservés.`,
    visitSocialNetworks: 'Suivez-nous sur les réseaux sociaux',
    supportEmail: supportContact.email,
    websiteUrl: 'https://tonnkama.com',

    // Vérification d'email
    emailVerification: {
      instruction: '🎉 Félicitations ! Votre compte Trouve Ton Nkama a été créé avec succès ! Pour publier vos annonces immobilières sur notre plateforme, vous devez d\'abord vérifier votre adresse email.',
      buttonText: 'Vérifier mon email et activer mon compte',
      additionalInfo: 'Une fois votre email vérifié, vous pourrez publier et gérer vos annonces immobilières en toute sécurité.',
      expirationInfo: '⚠️ IMPORTANT : Ce lien de vérification expire dans exactement 24 heures à compter de maintenant pour votre sécurité. Pensez à cliquer dessus rapidement !',
    },

    // Réinitialisation de mot de passe
    passwordReset: {
      instruction: 'Vous avez demandé la réinitialisation de votre mot de passe pour votre compte Trouve Ton Nkama. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe sécurisé.',
      buttonText: 'Réinitialiser mon mot de passe maintenant',
      additionalInfo: 'Si vous n\'avez pas demandé cette réinitialisation, ignorez ce message. Votre mot de passe actuel reste inchangé et votre compte est en sécurité.',
      expirationInfo: '⚠️ URGENT : Ce lien de réinitialisation expire dans 1 heure seulement pour votre sécurité. Utilisez-le rapidement !',
      securityInfo: '🔒 Pour votre protection, ce lien ne peut être utilisé qu\'une seule fois. Après utilisation, il devient automatiquement invalide.',
    },

    // Email de bienvenue
    welcome: {
      welcomeMessage: 'Bienvenue sur Trouve Ton Nkama !',
      descriptionMessage: 'Nous sommes ravis de vous accueillir sur la première plateforme immobilière dédiée au Gabon. Découvrez comment notre plateforme peut vous aider dans vos projets immobiliers.',
      featuresTitle: 'Que pouvez-vous faire sur Trouve Ton Nkama ?',
      features: [
        'Rechercher des propriétés dans tout le Gabon',
        'Publier vos annonces immobilières gratuitement',
        'Contacter directement les propriétaires',
        'Sauvegarder vos annonces favorites',
        'Gérer votre profil et vos annonces',
        'Recevoir des notifications personnalisées',
      ],
      gettingStartedTitle: 'Comment commencer ?',
      gettingStartedSteps: [
        'Complétez votre profil pour gagner en crédibilité',
        'Explorez les annonces disponibles dans votre région',
        'Contactez les propriétaires qui vous intéressent',
        'Publiez votre première annonce si vous êtes propriétaire',
        'Activez les notifications pour ne rien manquer',
      ],
      ctaButtonText: 'Commencer à explorer',
      ctaButtonUrl: 'https://tonnkama.com/search',
      supportMessage: 'Notre équipe est là pour vous accompagner dans votre parcours immobilier.',
    },

    // Notification de propriété
    propertyNotification: {
      notificationTitle: 'Nouvelle propriété correspondant à vos critères !',
      propertyDetails: 'Détails de la propriété',
      viewButtonText: 'Voir l\'annonce',
      contactButtonText: 'Contacter le propriétaire',
      unsubscribeText: 'Vous ne souhaitez plus recevoir ces notifications ?',
      unsubscribeLink: 'https://tonnkama.com/unsubscribe',
    },

    // Propriété publiée
    propertyPublished: {
      congratulationsTitle: 'Félicitations ! Votre annonce est en ligne !',
      publishedMessage: 'Votre annonce immobilière a été publiée avec succès sur Trouve Ton Nkama et est maintenant visible par des milliers d\'utilisateurs.',
      propertyDetails: 'Détails de votre annonce',
      managementTitle: 'Gérez votre annonce facilement',
      managementOptions: [
        'Modifiez les détails de votre annonce à tout moment',
        'Suivez les statistiques de vues et de contacts',
        'Renouvelez automatiquement votre annonce avant expiration',
        'Partagez votre annonce sur les réseaux sociaux',
      ],
      viewButtonText: 'Voir mon annonce',
      editButtonText: 'Modifier l\'annonce',
      shareButtonText: 'Partager l\'annonce',
      tipsTitle: 'Conseils pour optimiser votre annonce',
      tips: [
        'Ajoutez des photos de qualité pour attirer plus de visiteurs',
        'Rédigez une description détaillée et attractive',
        'Mettez à jour régulièrement votre annonce',
        'Répondez rapidement aux messages des intéressés',
        'Utilisez les bons mots-clés pour améliorer la visibilité',
      ],
    },
  };

  /**
   * Génère les props pour l'email générique de test
   */
  static generateGenericEmailProps(
    name: string,
    email: string,
    actionLink?: string,
    customTexts?: Partial<typeof EmailService.defaultTexts>
  ) {
    const texts = { ...EmailService.defaultTexts, ...customTexts };
    return {
      name,
      email,
      actionLink,
      texts: {
        ...texts,
        title: 'Email de Test',
        subtitle: 'Trouve Ton Nkama',
        mainMessage: 'Ceci est un email de test pour vérifier l\'affichage du logo et la mise en page. Tous les éléments visuels devraient s\'afficher correctement dans votre client email.',
        buttonText: actionLink ? 'Visiter Trouve Ton Nkama' : undefined,
        footerMessage: 'Cet email a été envoyé pour tester l\'affichage des templates.',
        additionalInfo: 'Email de test - aucune action requise.',
      },
    };
  }

  /**
   * Génère les props pour le template EmailVerification
   */
  static generateEmailVerificationProps(
    name: string,
    email: string,
    verificationLink: string,
    customTexts?: Partial<typeof EmailService.defaultTexts>
  ) {
    const texts = { ...EmailService.defaultTexts, ...customTexts };
    return {
      name,
      email,
      verificationLink,
      texts: {
        ...texts,
        ...texts.emailVerification,
      },
    };
  }

  /**
   * Génère les props pour le template PasswordReset
   */
  static generatePasswordResetProps(
    name: string,
    email: string,
    resetLink: string,
    customTexts?: Partial<typeof EmailService.defaultTexts>
  ) {
    const texts = { ...EmailService.defaultTexts, ...customTexts };
    return {
      name,
      email,
      resetLink,
      texts: {
        ...texts,
        ...texts.passwordReset,
      },
    };
  }

  /**
   * Génère les props pour le template WelcomeEmail
   */
  static generateWelcomeEmailProps(
    name: string,
    email: string,
    customTexts?: Partial<typeof EmailService.defaultTexts>
  ) {
    const texts = { ...EmailService.defaultTexts, ...customTexts };
    return {
      name,
      email,
      texts: {
        ...texts,
        ...texts.welcome,
      },
    };
  }

  /**
   * Génère les props pour le template PropertyNotification
   */
  static generatePropertyNotificationProps(
    name: string,
    email: string,
    property: any,
    customTexts?: Partial<typeof EmailService.defaultTexts>
  ) {
    const texts = { ...EmailService.defaultTexts, ...customTexts };
    return {
      name,
      email,
      property,
      texts: {
        ...texts,
        ...texts.propertyNotification,
      },
    };
  }

  /**
   * Génère les props pour le template PropertyPublished
   */
  static generatePropertyPublishedProps(
    name: string,
    email: string,
    property: any,
    customTexts?: Partial<typeof EmailService.defaultTexts>
  ) {
    const texts = { ...EmailService.defaultTexts, ...customTexts };
    return {
      name,
      email,
      property,
      texts: {
        ...texts,
        ...texts.propertyPublished,
      },
    };
  }
}

// Export des utilitaires
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}; 