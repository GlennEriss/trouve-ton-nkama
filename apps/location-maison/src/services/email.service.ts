import nodemailer from 'nodemailer';
import { google } from 'googleapis';

interface EmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Initialisation du transporteur en mode lazy
  }

  /**
   * Crée le transporteur Nodemailer avec OAuth2
   */
  private async createTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const OAuth2 = google.auth.OAuth2;

    const oauth2Client = new OAuth2(
      process.env.GMAIL_OAUTH_CLIENT_ID,
      process.env.GMAIL_OAUTH_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
    });

    const accessToken = await new Promise<string>((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) {
          reject(err);
        } else {
          resolve(token as string);
        }
      });
    });

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_SENDER_EMAIL,
        clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
        clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    return this.transporter;
  }

  /**
   * Envoie un email avec gestion du mode développement/production
   */
  async sendEmail(options: EmailOptions, debugLink?: string): Promise<void> {
    // Vérifier si l'envoi réel est forcé ou si on est en production
    const forceRealEmail = process.env.FORCE_REAL_EMAILS === 'true';
    
    // En développement, on affiche juste le lien de debug (sauf si forcé)
    if (process.env.NODE_ENV === 'development' && !forceRealEmail) {
      console.log('📧 Email simulé avec Gmail:', {
        from: options.from,
        to: options.to,
        subject: options.subject,
        debugLink: debugLink || 'N/A'
      });
      console.log('💡 Pour envoyer des emails réels en dev, ajoutez: FORCE_REAL_EMAILS=true');
      return;
    }

    // En production, envoyer l'email réel
    try {
      const transporter = await this.createTransporter();
      
      await transporter.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi d\'email avec Gmail:', error);
      throw new Error('Impossible d\'envoyer l\'email via Gmail');
    }
  }

  /**
   * Obtient l'adresse email d'expédition par défaut avec le nom d'affichage
   */
  static getDefaultFromAddress(): string {
    const email = process.env.GMAIL_SENDER_EMAIL || 'noreply@tonnkama.com';
    const displayName = process.env.EMAIL_DISPLAY_NAME || 'Trouve Ton Nkama';
    return `"${displayName}" <${email}>`;
  }

  /**
   * Obtient seulement l'adresse email sans nom d'affichage
   */
  static getEmailOnly(): string {
    return process.env.GMAIL_SENDER_EMAIL || 'noreply@tonnkama.com';
  }

  /**
   * Valide une adresse email
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Vérifie si la configuration Gmail OAuth2 est complète
   */
  static checkGmailConfiguration(): boolean {
    const requiredEnvVars = [
      'GMAIL_SENDER_EMAIL',
      'GMAIL_OAUTH_CLIENT_ID',
      'GMAIL_OAUTH_CLIENT_SECRET',
      'GMAIL_OAUTH_REFRESH_TOKEN'
    ];

    return requiredEnvVars.every(envVar => process.env[envVar]);
  }
}

// Export d'une instance singleton
export const emailService = new EmailService(); 