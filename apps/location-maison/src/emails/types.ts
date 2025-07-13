// Interface de base pour les props des emails
export interface BaseEmailProps {
  name: string;
  email: string;
  texts: {
    greeting: string;
    copyRight: string;
    visitSocialNetworks: string;
    supportEmail: string;
    websiteUrl: string;
  };
}

// Interface pour la vérification d'email
export interface EmailVerificationProps extends BaseEmailProps {
  verificationLink: string;
  texts: BaseEmailProps['texts'] & {
    instruction: string;
    buttonText: string;
    additionalInfo: string;
    expirationInfo: string;
  };
}

// Interface pour la réinitialisation de mot de passe
export interface PasswordResetProps extends BaseEmailProps {
  resetLink: string;
  texts: BaseEmailProps['texts'] & {
    instruction: string;
    buttonText: string;
    additionalInfo: string;
    expirationInfo: string;
    securityInfo: string;
  };
}

// Interface pour l'email de bienvenue
export interface WelcomeEmailProps extends BaseEmailProps {
  texts: BaseEmailProps['texts'] & {
    welcomeMessage: string;
    descriptionMessage: string;
    featuresTitle: string;
    features: string[];
    gettingStartedTitle: string;
    gettingStartedSteps: string[];
    ctaButtonText: string;
    ctaButtonUrl: string;
    supportMessage: string;
  };
}

// Interface pour les notifications de propriété
export interface PropertyNotificationProps extends BaseEmailProps {
  property: {
    id: string;
    title: string;
    price: number;
    location: string;
    type: string;
    area?: number;
    imageUrl?: string;
    description: string;
  };
  texts: BaseEmailProps['texts'] & {
    notificationTitle: string;
    propertyDetails: string;
    viewButtonText: string;
    contactButtonText: string;
    unsubscribeText: string;
    unsubscribeLink: string;
  };
}

// Interface pour la confirmation de publication d'annonce
export interface PropertyPublishedProps extends BaseEmailProps {
  property: {
    id: string;
    title: string;
    price: number;
    location: string;
    type: string;
    area?: number;
    imageUrl?: string;
    publishedAt: string;
    expiresAt: string;
  };
  texts: BaseEmailProps['texts'] & {
    congratulationsTitle: string;
    publishedMessage: string;
    propertyDetails: string;
    managementTitle: string;
    managementOptions: string[];
    viewButtonText: string;
    editButtonText: string;
    shareButtonText: string;
    tipsTitle: string;
    tips: string[];
  };
}

// Interface pour les notifications de contact
export interface ContactNotificationProps extends BaseEmailProps {
  contact: {
    name: string;
    email: string;
    phone?: string;
    message: string;
    contactedAt: string;
  };
  property: {
    id: string;
    title: string;
    location: string;
  };
  texts: BaseEmailProps['texts'] & {
    notificationTitle: string;
    contactMessage: string;
    propertyInfo: string;
    responseAdvice: string;
    viewButtonText: string;
    contactButtonText: string;
  };
}

// Interface pour les rappels d'expiration d'annonce
export interface ExpirationReminderProps extends BaseEmailProps {
  property: {
    id: string;
    title: string;
    location: string;
    expiresAt: string;
    daysRemaining: number;
  };
  texts: BaseEmailProps['texts'] & {
    reminderTitle: string;
    expirationMessage: string;
    renewButtonText: string;
    editButtonText: string;
    deleteButtonText: string;
    faqMessage: string;
  };
}

// Type union pour tous les types d'emails
export type EmailProps = 
  | EmailVerificationProps 
  | PasswordResetProps 
  | WelcomeEmailProps 
  | PropertyNotificationProps 
  | PropertyPublishedProps 
  | ContactNotificationProps 
  | ExpirationReminderProps;

// Énumération des types d'emails
export enum EmailType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  WELCOME = 'welcome',
  PROPERTY_NOTIFICATION = 'property_notification',
  PROPERTY_PUBLISHED = 'property_published',
  CONTACT_NOTIFICATION = 'contact_notification',
  EXPIRATION_REMINDER = 'expiration_reminder',
}

// Interface pour les configurations d'email
export interface EmailConfig {
  from: string;
  replyTo: string;
  supportEmail: string;
  websiteUrl: string;
  unsubscribeUrl: string;
  logoUrl: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
} 