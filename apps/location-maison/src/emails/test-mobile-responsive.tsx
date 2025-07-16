import React from "react";
import { render } from "@react-email/render";
import Layout from "./Layout";
import EmailVerification from "./EmailVerification";
import WelcomeEmail from "./WelcomeEmail";
import PasswordReset from "./PasswordReset";
import GenericEmail from "./GenericEmail";
import PropertyPublished from "./PropertyPublished";
import { EmailVerificationProps, WelcomeEmailProps, PasswordResetProps, GenericEmailProps } from "./types";

// Données de test pour EmailVerification
const emailVerificationData = {
  name: "John Doe",
  email: "john@example.com",
  verificationUrl: "https://example.com/verify?token=abc123",
  texts: {
    greeting: "Bonjour",
    title: "Vérifiez votre adresse email",
    message: "Cliquez sur le bouton ci-dessous pour vérifier votre adresse email.",
    buttonText: "Vérifier mon email",
    copyRight: "© 2024 Trouve Ton Nkama. Tous droits réservés.",
    supportEmail: "support@trouvetonnkama.com",
    websiteUrl: "https://trouvetonnkama.com",
  },
};

// Données de test pour WelcomeEmail
const welcomeEmailData = {
  name: "Jane Smith",
  email: "jane@example.com",
  texts: {
    greeting: "Bienvenue",
    title: "Bienvenue sur Trouve Ton Nkama !",
    message: "Nous sommes ravis de vous accueillir sur notre plateforme.",
    copyRight: "© 2024 Trouve Ton Nkama. Tous droits réservés.",
    supportEmail: "support@trouvetonnkama.com",
    websiteUrl: "https://trouvetonnkama.com",
  },
};

// Données de test pour PasswordReset
const passwordResetData = {
  name: "Alice Johnson",
  email: "alice@example.com",
  resetUrl: "https://example.com/reset?token=xyz789",
  texts: {
    greeting: "Bonjour",
    title: "Réinitialisation de votre mot de passe",
    message: "Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.",
    buttonText: "Réinitialiser mon mot de passe",
    warning: "Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.",
    copyRight: "© 2024 Trouve Ton Nkama. Tous droits réservés.",
    supportEmail: "support@trouvetonnkama.com",
    websiteUrl: "https://trouvetonnkama.com",
  },
};

// Données de test pour GenericEmail (même structure que PasswordReset)
const genericEmailData = {
  name: "Bob Wilson",
  email: "bob@example.com",
  resetUrl: "#", // Lien vide pour éviter les vraies réinitialisations
  texts: {
    greeting: "Bonjour",
    title: "Test d'email générique",
    message: "Ceci est un test d'email avec la même structure que PasswordReset mais avec des liens vides pour éviter les actions réelles.",
    buttonText: "Bouton de test",
    warning: "Ceci est un email de test - aucun lien ne fonctionne.",
    copyRight: "© 2024 Trouve Ton Nkama. Tous droits réservés.",
    supportEmail: "support@trouvetonnkama.com",
    websiteUrl: "https://trouvetonnkama.com",
  },
};

// Données de test pour PropertyPublished
const propertyPublishedData = {
  name: "Marie Dupont",
  email: "marie@example.com",
  property: {
    id: "prop123",
    title: "Appartement moderne 3 pièces",
    location: "Douala, Akwa",
    type: "Appartement",
    area: 85,
    price: 250000,
    imageUrl: "https://via.placeholder.com/400x250/2563eb/ffffff?text=Appartement",
    publishedAt: "2024-01-15T10:00:00Z",
    expiresAt: "2024-02-15T10:00:00Z",
  },
  texts: {
    greeting: "Félicitations",
    congratulationsTitle: "Votre annonce a été publiée avec succès !",
    publishedMessage: "Votre propriété est maintenant visible par tous les utilisateurs de Trouve Ton Nkama.",
    viewButtonText: "Voir mon annonce",
    editButtonText: "Modifier mon annonce",
    shareButtonText: "Partager mon annonce",
    managementTitle: "Gestion de votre annonce",
    managementOptions: [
      "Modifier les détails de votre propriété",
      "Ajouter ou supprimer des photos",
      "Ajuster le prix",
      "Activer/désactiver l'annonce",
      "Supprimer l'annonce",
    ],
    tipsTitle: "Conseils pour optimiser votre annonce",
    tips: [
      "Ajoutez des photos de qualité pour attirer plus d'attention",
      "Rédigez une description détaillée et attractive",
      "Répondez rapidement aux demandes des visiteurs",
      "Mettez à jour régulièrement les informations",
      "Partagez votre annonce sur les réseaux sociaux",
    ],
    copyRight: "© 2024 Trouve Ton Nkama. Tous droits réservés.",
    supportEmail: "support@trouvetonnkama.com",
    websiteUrl: "https://trouvetonnkama.com",
  },
};

// Fonction pour générer les emails de test
export const generateTestEmails = () => {
  const emailVerificationHTML = render(
    <EmailVerification {...emailVerificationData} />
  );
  
  const welcomeEmailHTML = render(
    <WelcomeEmail {...welcomeEmailData} />
  );
  
  const passwordResetHTML = render(
    <PasswordReset {...passwordResetData} />
  );
  
  const genericEmailHTML = render(
    <GenericEmail {...genericEmailData} />
  );
  
  return {
    emailVerification: emailVerificationHTML,
    welcomeEmail: welcomeEmailHTML,
    passwordReset: passwordResetHTML,
    genericEmail: genericEmailHTML
  };
};

// Fonction pour tester la responsivité
export const testMobileResponsiveness = () => {
  const { emailVerification, welcomeEmail, passwordReset, genericEmail } = generateTestEmails();
  
  console.log("=== Test de responsivité mobile ===");
  console.log("Email de vérification généré avec succès");
  console.log("Email de bienvenue généré avec succès");
  console.log("Email de réinitialisation de mot de passe généré avec succès");
  console.log("Email générique généré avec succès");
  
  // Vérifier la présence des classes CSS mobile
  const mobileClasses = [
    'mobile-container',
    'mobile-content',
    'mobile-button',
    'mobile-text-small',
    'mobile-text-medium',
    'mobile-text-large',
    'mobile-section'
  ];
  
  const emails = [emailVerification, welcomeEmail, passwordReset, genericEmail];
  const emailNames = ['EmailVerification', 'WelcomeEmail', 'PasswordReset', 'GenericEmail'];
  
  let allEmailsHaveMobileClasses = true;
  
  emails.forEach((email, index) => {
    const hasMobileClasses = mobileClasses.every(className => 
      email.includes(className)
    );
    
    if (hasMobileClasses) {
      console.log(`✅ ${emailNames[index]} : Toutes les classes CSS mobile sont présentes`);
    } else {
      console.log(`❌ ${emailNames[index]} : Certaines classes CSS mobile sont manquantes`);
      allEmailsHaveMobileClasses = false;
    }
  });
  
  // Vérifier la présence des media queries
  const hasMediaQueries = emails.every(email => email.includes('@media'));
  
  if (hasMediaQueries) {
    console.log("✅ Les media queries sont présentes dans tous les emails");
  } else {
    console.log("❌ Les media queries sont manquantes dans certains emails");
  }
  
  return {
    success: allEmailsHaveMobileClasses && hasMediaQueries,
    emailVerification,
    welcomeEmail,
    passwordReset,
    genericEmail
  };
};

// Export des composants de test
export const TestEmailVerification = () => (
  <EmailVerification {...emailVerificationData} />
);

export const TestWelcomeEmail = () => (
  <WelcomeEmail {...welcomeEmailData} />
);

export const TestPasswordReset = () => (
  <PasswordReset {...passwordResetData} />
);

export const TestGenericEmail = () => (
  <GenericEmail {...genericEmailData} />
);

export const TestPropertyPublished = () => (
  <PropertyPublished {...propertyPublishedData} />
);

export default {
  generateTestEmails,
  testMobileResponsiveness,
  TestEmailVerification,
  TestWelcomeEmail,
  TestPasswordReset,
  TestGenericEmail,
  TestPropertyPublished
}; 