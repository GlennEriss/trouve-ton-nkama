export interface SMSResult {
  success: boolean;
  message: string;
  messageId?: string;
  error?: string;
}

import { createLogger } from '@/lib/logger';

const logger = createLogger('services.sms');

export class SMSService {
  private static instance: SMSService;

  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  /**
   * Génère un code OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Envoie un SMS avec un code OTP (simulation)
   */
  async sendOTP(phoneNumber: string): Promise<SMSResult> {
    try {
      const code = this.generateOTP();
      const message = `Votre code de vérification est: ${code}`;

      // Simulation de l'envoi de SMS
      logger.info('SMS simulé', {
        to: phoneNumber,
        message: message,
        code: code
      });
      
      // Simuler un délai d'envoi
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        message: 'Code OTP envoyé avec succès',
        messageId: 'sim-' + Date.now()
      };

    } catch (error: any) {
      logger.error('Erreur lors de l\'envoi du SMS', { error });
      
      return {
        success: false,
        message: 'Erreur lors de l\'envoi du SMS',
        error: error.message
      };
    }
  }
}

// Export de l'instance singleton
export const smsService = SMSService.getInstance(); 
