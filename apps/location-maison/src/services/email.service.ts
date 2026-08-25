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
  /** true si l'envoi est passé par le SMTP de secours et non par le principal. */
  usedFallback?: boolean;
}

type TransportKind = 'primary' | 'fallback';
type EmailProvider = 'hostinger' | 'gmail_oauth2';

/** Provider actif pour le transport PRINCIPAL. Bascule via EMAIL_PROVIDER (Vercel). */
function getActiveProvider(): EmailProvider {
  return process.env.EMAIL_PROVIDER === 'gmail_oauth2' ? 'gmail_oauth2' : 'hostinger';
}

/**
 * Envoi d'emails transactionnels (vérification d'adresse, notifications).
 *
 * Le transport PRINCIPAL a deux modes possibles, sélectionnés par EMAIL_PROVIDER :
 * - 'hostinger' (défaut)  : SMTP Hostinger / contact@tonnkama.com.
 * - 'gmail_oauth2'        : Gmail via OAuth2 (GMAIL_SENDER_EMAIL + GMAIL_OAUTH_CLIENT_ID/
 *   CLIENT_SECRET/REFRESH_TOKEN), l'ancien mode utilisé avant l'arrivée de Hostinger.
 *   Objectif : pouvoir basculer en un redéploiement si Hostinger retombe en panne (facture,
 *   etc.), sans dépendre d'un mot de passe d'application à régénérer.
 *
 * En plus, un transport de SECOURS (n'importe quel SMTP, Gmail par défaut avec mot de passe
 * d'application) est activé automatiquement si FALLBACK_EMAIL_USER + FALLBACK_EMAIL_PASS sont
 * définis — il s'essaie quel que soit le provider principal choisi.
 *
 * Pourquoi un secours (2026-08-18) : la boîte contact@tonnkama.com est tombée en panne
 * d'authentification (535 5.7.8, facture impayée) et PERSONNE ne s'en est aperçu — les
 * inscriptions renvoyaient « succès » sans qu'aucun email ne parte, et comme la connexion
 * par mot de passe refuse les comptes non vérifiés (next-auth/auth.config.ts), les
 * utilisateurs concernés se retrouvaient enfermés dehors.
 *
 * ⚠️ L'expéditeur est FORCÉ sur l'adresse du transport réellement utilisé : un serveur SMTP
 * refuse (ou réécrit silencieusement) un From qui n'est pas le compte authentifié — Gmail en
 * particulier. Envoyer via Gmail en gardant « contact@tonnkama.com » en From ferait échouer
 * l'envoi ou casserait SPF/DKIM, donc atterrirait en spam.
 */
export class EmailService {
  private transporters: Partial<Record<TransportKind, nodemailer.Transporter>> = {};

  /** Le SMTP de secours n'est utilisable que si ses deux identifiants sont fournis. */
  static isFallbackConfigured(): boolean {
    return Boolean(process.env.FALLBACK_EMAIL_USER && process.env.FALLBACK_EMAIL_PASS);
  }

  static isGmailOAuth2Configured(): boolean {
    return Boolean(
      process.env.GMAIL_SENDER_EMAIL &&
        process.env.GMAIL_OAUTH_CLIENT_ID &&
        process.env.GMAIL_OAUTH_CLIENT_SECRET &&
        process.env.GMAIL_OAUTH_REFRESH_TOKEN,
    );
  }

  static checkHostingerConfiguration(): boolean {
    return Boolean(process.env.HOSTINGER_EMAIL_USER && process.env.HOSTINGER_EMAIL_PASS);
  }

  /** Le transport PRINCIPAL est-il utilisable, quel que soit le provider actif ? */
  static isPrimaryConfigured(): boolean {
    return getActiveProvider() === 'gmail_oauth2'
      ? EmailService.isGmailOAuth2Configured()
      : EmailService.checkHostingerConfiguration();
  }

  private getTransportConfig(kind: TransportKind) {
    if (kind === 'primary') {
      const usingGmailOAuth2 = getActiveProvider() === 'gmail_oauth2';
      return {
        host: process.env.HOSTINGER_SMTP_HOST || 'smtp.hostinger.com',
        port: Number(process.env.HOSTINGER_SMTP_PORT || 465),
        user: usingGmailOAuth2
          ? process.env.GMAIL_SENDER_EMAIL || ''
          : process.env.HOSTINGER_EMAIL_USER || '',
        pass: process.env.HOSTINGER_EMAIL_PASS || '',
      };
    }
    return {
      host: process.env.FALLBACK_SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.FALLBACK_SMTP_PORT || 465),
      user: process.env.FALLBACK_EMAIL_USER || '',
      pass: process.env.FALLBACK_EMAIL_PASS || '',
    };
  }

  private createTransporter(kind: TransportKind): nodemailer.Transporter {
    const cached = this.transporters[kind];
    if (cached) {
      return cached;
    }

    let transporter: nodemailer.Transporter;
    if (kind === 'primary' && getActiveProvider() === 'gmail_oauth2') {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.GMAIL_SENDER_EMAIL,
          clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
          clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
          refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
        },
      });
    } else {
      const { host, port, user, pass } = this.getTransportConfig(kind);
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }

    this.transporters[kind] = transporter;
    return transporter;
  }

  /** Adresse d'expédition correspondant au transport réellement utilisé. */
  private buildFromAddress(kind: TransportKind): string {
    const { user } = this.getTransportConfig(kind);
    const displayName = process.env.EMAIL_DISPLAY_NAME || 'Trouve Ton Nkama';
    return `"${displayName}" <${user}>`;
  }

  private async trySend(kind: TransportKind, options: EmailOptions): Promise<EmailSendResult> {
    const transporter = this.createTransporter(kind);
    const info = await transporter.sendMail({
      ...options,
      from: this.buildFromAddress(kind),
    });

    return {
      simulated: false,
      messageId: info.messageId,
      accepted: Array.isArray(info.accepted) ? info.accepted.map(String) : [],
      rejected: Array.isArray(info.rejected) ? info.rejected.map(String) : [],
      usedFallback: kind === 'fallback',
    };
  }

  async sendEmail(options: EmailOptions, debugLink?: string): Promise<EmailSendResult> {
    const forceRealEmail = process.env.FORCE_REAL_EMAILS === 'true';

    if (process.env.NODE_ENV === 'development' && !forceRealEmail) {
      logger.info('Email simulé (aucun envoi réel)', {
        from: options.from,
        to: options.to,
        subject: options.subject,
        debugLink: debugLink || 'N/A',
      });
      logger.info('Pour envoyer des emails réels en dev, ajoutez FORCE_REAL_EMAILS=true');
      return { simulated: true, accepted: [options.to], rejected: [] };
    }

    let primaryError: unknown;
    try {
      return await this.trySend('primary', options);
    } catch (error) {
      primaryError = error;
      // On garde le détail (code SMTP, message serveur) : c'est la seule trace exploitable
      // pour distinguer un mot de passe invalide d'une panne réseau.
      logger.error('Échec du SMTP principal', {
        provider: getActiveProvider(),
        host: getActiveProvider() === 'gmail_oauth2' ? 'smtp.gmail.com (OAuth2)' : this.getTransportConfig('primary').host,
        user: this.getTransportConfig('primary').user,
        code: (error as { code?: string })?.code,
        message: (error as Error)?.message,
      });
    }

    if (!EmailService.isFallbackConfigured()) {
      throw new Error(
        "Impossible d'envoyer l'email : le SMTP principal a échoué et aucun SMTP de secours n'est configuré (FALLBACK_EMAIL_USER / FALLBACK_EMAIL_PASS).",
        { cause: primaryError },
      );
    }

    try {
      const result = await this.trySend('fallback', options);
      logger.warn('Email envoyé via le SMTP de SECOURS (le principal est en panne)', {
        to: options.to,
        from: this.buildFromAddress('fallback'),
        messageId: result.messageId,
      });
      return result;
    } catch (fallbackError) {
      logger.error('Échec du SMTP de secours', {
        host: this.getTransportConfig('fallback').host,
        user: this.getTransportConfig('fallback').user,
        code: (fallbackError as { code?: string })?.code,
        message: (fallbackError as Error)?.message,
      });
      throw new Error(
        "Impossible d'envoyer l'email : le SMTP principal ET le SMTP de secours ont échoué.",
        { cause: fallbackError },
      );
    }
  }

  /**
   * Adresse d'expédition par défaut. Bascule sur l'adresse de secours quand le principal
   * n'est pas configuré, pour que l'aperçu corresponde à ce qui partira réellement.
   * NB : `sendEmail` refixe de toute façon le From selon le transport utilisé.
   */
  static getDefaultFromAddress(): string {
    const displayName = process.env.EMAIL_DISPLAY_NAME || 'Trouve Ton Nkama';
    return `"${displayName}" <${EmailService.getEmailOnly()}>`;
  }

  static getEmailOnly(): string {
    if (getActiveProvider() === 'gmail_oauth2' && process.env.GMAIL_SENDER_EMAIL) {
      return process.env.GMAIL_SENDER_EMAIL;
    }
    return (
      process.env.HOSTINGER_EMAIL_USER ||
      process.env.FALLBACK_EMAIL_USER ||
      'ton.email@tondomaine.com'
    );
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const emailService = new EmailService();
