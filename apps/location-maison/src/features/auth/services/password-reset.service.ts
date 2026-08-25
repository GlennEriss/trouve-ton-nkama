import { createLogger } from '@/lib/logger';
import type {
  PasswordResetConfirmResult,
  PasswordResetError,
  PasswordResetRequestResult,
  PasswordResetService,
} from './password-reset.service.interface';
import { PasswordResetConfirmErrorCode, PasswordResetRequestErrorCode } from './password-reset.service.interface';
import { auth, sendPasswordResetEmail } from '@/firebase/auth';
import { isFirebaseDefaultEmailProvider, getAppHost } from '@/lib/email-provider-client';

const logger = createLogger('auth.password-reset-service');

type ApiErrorBody = {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  } | string;
  retryAfter?: number;
};

function extractApiError(data: ApiErrorBody | null): PasswordResetError {
  if (!data) {
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Une erreur est survenue.',
    };
  }

  if (typeof data.error === 'string') {
    return {
      code: 'UNKNOWN_ERROR',
      message: data.error,
    };
  }

  if (data.error?.code || data.error?.message) {
    return {
      code: data.error.code || 'UNKNOWN_ERROR',
      message: data.error.message || 'Une erreur est survenue.',
      details: data.error.details,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Une erreur est survenue.',
  };
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function mapFirebaseAuthErrorCode(code: string | undefined): PasswordResetRequestErrorCode {
  switch (code) {
    case 'auth/user-not-found':
      return PasswordResetRequestErrorCode.USER_NOT_FOUND;
    case 'auth/invalid-email':
      return PasswordResetRequestErrorCode.INVALID_EMAIL;
    case 'auth/user-disabled':
      return PasswordResetRequestErrorCode.USER_DISABLED;
    case 'auth/too-many-requests':
      return PasswordResetRequestErrorCode.RATE_LIMIT_EXCEEDED;
    default:
      return PasswordResetRequestErrorCode.UNKNOWN_ERROR;
  }
}

export class PasswordResetServiceImpl implements PasswordResetService {
  async requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
    // handleCodeInApp: true pointe directement vers notre page /password-reset existante
    // (oobCode en query param) — même flux de confirmation que le lien généré côté serveur,
    // seul l'envoi change. Ne pas passer par le mode 'firebase par défaut' (handleCodeInApp:
    // false) : Firebase gérerait alors la réinitialisation sur sa propre page générique,
    // court-circuitant notre notification d'activité de compte (voir /api/auth/password-reset).
    if (isFirebaseDefaultEmailProvider()) {
      try {
        await sendPasswordResetEmail(auth, email, {
          url: `${getAppHost()}/password-reset`,
          handleCodeInApp: true,
        });
        logger.info('Password reset request succeeded (Firebase default)', { email });
        return { success: true };
      } catch (error: any) {
        logger.warn('Password reset request failed (Firebase default)', {
          email,
          code: error?.code,
        });
        return {
          success: false,
          error: {
            code: mapFirebaseAuthErrorCode(error?.code),
            message: 'Impossible d\'envoyer l\'email de réinitialisation. Réessayez plus tard.',
          },
        };
      }
    }

    try {
      const response = await fetch('/api/auth/send-password-reset-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          subject: 'Réinitialisez votre mot de passe - Trouve Ton Nkama',
        }),
      });

      const data = await parseJsonSafely<ApiErrorBody>(response);

      if (response.ok && data?.success) {
        logger.info('Password reset request succeeded', { email });
        return { success: true };
      }

      const error = extractApiError(data);
      const retryAfterFromErrorDetails =
        data?.error && typeof data.error === 'object'
          ? data.error.details?.retryAfter
          : undefined;
      const retryAfterRaw = data?.retryAfter ?? retryAfterFromErrorDetails;
      const retryAfter = typeof retryAfterRaw === 'number' ? retryAfterRaw : undefined;

      logger.warn('Password reset request failed', {
        email,
        status: response.status,
        code: error.code,
        retryAfter,
      });

      return {
        success: false,
        error: {
          ...error,
          code: (error.code || PasswordResetRequestErrorCode.UNKNOWN_ERROR) as string,
        },
        retryAfter,
      };
    } catch (error) {
      logger.error('Password reset request crashed', { email, error });
      return {
        success: false,
        error: {
          code: PasswordResetRequestErrorCode.NETWORK_ERROR,
          message: 'Impossible de contacter le serveur. Vérifiez votre connexion internet.',
        },
      };
    }
  }

  async confirmPasswordReset(oobCode: string, newPassword: string): Promise<PasswordResetConfirmResult> {
    if (!oobCode) {
      return {
        success: false,
        error: {
          code: PasswordResetConfirmErrorCode.MISSING_OOB_CODE,
          message: 'Le lien de réinitialisation est invalide.',
        },
      };
    }

    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oobCode,
          newPassword,
        }),
      });

      const data = await parseJsonSafely<ApiErrorBody>(response);

      if (response.ok && data?.success) {
        logger.info('Password reset confirmation succeeded', { hasOobCode: true });
        return { success: true };
      }

      const error = extractApiError(data);
      logger.warn('Password reset confirmation failed', {
        status: response.status,
        code: error.code,
      });

      return {
        success: false,
        error: {
          ...error,
          code: (error.code || PasswordResetConfirmErrorCode.UNKNOWN_ERROR) as string,
        },
      };
    } catch (error) {
      logger.error('Password reset confirmation crashed', { error });
      return {
        success: false,
        error: {
          code: PasswordResetConfirmErrorCode.NETWORK_ERROR,
          message: 'Impossible de contacter le serveur. Vérifiez votre connexion internet.',
        },
      };
    }
  }
}

export const passwordResetService = new PasswordResetServiceImpl();
