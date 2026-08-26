import nodemailer from 'nodemailer';
import { createLogger } from '@/lib/logger';

const logger = createLogger('services.email');

interface EmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSendResult {
  simulated: boolean;
  messageId?: string;
  accepted: string[];
  rejected: string[];
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Initialisation du transporteur en mode lazy
  }

  /**
   * Crée le transporteur Nodemailer (Gmail ou Hostinger selon l'adresse configurée)
   */
  private async createTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const user = process.env.HOSTINGER_EMAIL_USER || 'ton.email@tondomaine.com';
    const pass = process.env.HOSTINGER_EMAIL_PASS || 'tonMotDePasse';
    const isGmail = user.toLowerCase().endsWith('@gmail.com');

    this.transporter = nodemailer.createTransport({
      host: isGmail ? 'smtp.gmail.com' : 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    });

    return this.transporter;
  }

  /**
   * Envoie un email avec gestion du mode développement/production
   */
  async sendEmail(options: EmailOptions, debugLink?: string): Promise<EmailSendResult> {
    // Vérifier si l'envoi réel est forcé ou si on est en production
    const forceRealEmail = process.env.FORCE_REAL_EMAILS === 'true';
    
    // En développement, on affiche juste le lien de debug (sauf si forcé)
    if (process.env.NODE_ENV === 'development' && !forceRealEmail) {
      logger.info('Email simulé avec Hostinger SMTP', {
        from: options.from,
        to: options.to,
        subject: options.subject,
        debugLink: debugLink || 'N/A'
      });
      logger.info('Pour envoyer des emails réels en dev, ajoutez FORCE_REAL_EMAILS=true');
      return {
        simulated: true,
        accepted: [options.to],
        rejected: [],
      };
    }

    // En production, envoyer l'email réel
    try {
      const transporter = await this.createTransporter();
      
      const info = await transporter.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      return {
        simulated: false,
        messageId: info.messageId,
        accepted: Array.isArray(info.accepted) ? info.accepted.map(String) : [],
        rejected: Array.isArray(info.rejected) ? info.rejected.map(String) : [],
      };
    } catch (error) {
      logger.error('Erreur lors de l\'envoi d\'email avec Hostinger SMTP', { error });
      throw new Error('Impossible d\'envoyer l\'email via Hostinger SMTP');
    }
  }

  /**
   * Obtient l'adresse email d'expédition par défaut avec le nom d'affichage
   */
  static getDefaultFromAddress(): string {
    const email = process.env.HOSTINGER_EMAIL_USER || 'ton.email@tondomaine.com';
    const displayName = process.env.EMAIL_DISPLAY_NAME || 'Trouve Ton Nkama';
    return `"${displayName}" <${email}>`;
  }

  /**
   * Obtient seulement l'adresse email sans nom d'affichage
   */
  static getEmailOnly(): string {
    return process.env.HOSTINGER_EMAIL_USER || 'ton.email@tondomaine.com';
  }

  /**
   * Valide une adresse email
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Vérifie si la configuration Hostinger SMTP est complète
   */
  static checkHostingerConfiguration(): boolean {
    const requiredEnvVars = [
      'HOSTINGER_EMAIL_USER',
      'HOSTINGER_EMAIL_PASS'
    ];

    return requiredEnvVars.every(envVar => process.env[envVar]);
  }
}

// Export d'une instance singleton
export const emailService = new EmailService(); 
