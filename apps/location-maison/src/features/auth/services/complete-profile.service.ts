import { createLogger } from '@/lib/logger';
import type {
  CompleteProfileData,
  CompleteProfileResult,
  CompleteProfileService,
} from './complete-profile.service.interface';
import { CompleteProfileErrorCode } from './complete-profile.service.interface';

const logger = createLogger('auth.complete-profile-service');

/**
 * Client mince vers POST /api/auth/complete-profile.
 *
 * Avant ce correctif (2026-08-26), ce service écrivait directement dans Firestore depuis le
 * navigateur via le SDK client (userRepository.update). Ça exige une session Firebase Auth
 * réellement établie dans le navigateur, or ce n'est jamais le cas pour Google (le credential
 * Firebase est échangé server-side dans le callback NextAuth — voir oauth-google.service.ts)
 * : la sauvegarde échouait silencieusement avec PERMISSION_DENIED. Toute la logique de
 * validation + l'écriture Admin SDK vivent maintenant côté serveur, dans la route API — ce
 * service ne fait plus que transmettre les données et traduire la réponse.
 */
export class CompleteProfileServiceImpl implements CompleteProfileService {
  async completeProfile(data: CompleteProfileData): Promise<CompleteProfileResult> {
    try {
      const response = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const payload = await response.json().catch(() => null);

      if (response.ok && payload?.success) {
        return { success: true, user: payload.user };
      }

      const code = payload?.error?.code || CompleteProfileErrorCode.UNKNOWN_ERROR;
      const message = payload?.error?.message || 'Une erreur inattendue est survenue';

      logger.warn('Complete profile request rejected', {
        uid: data.uid,
        status: response.status,
        code,
      });

      return { success: false, error: { code, message } };
    } catch (error) {
      logger.error('Complete profile request crashed', { uid: data.uid, error });
      return {
        success: false,
        error: {
          code: CompleteProfileErrorCode.UNKNOWN_ERROR,
          message: 'Impossible de contacter le serveur. Vérifiez votre connexion internet.',
        },
      };
    }
  }
}

export const completeProfileService: CompleteProfileService = new CompleteProfileServiceImpl();
