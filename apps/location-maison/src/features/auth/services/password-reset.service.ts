import { createLogger } from '@/lib/logger';
import type {
  PasswordResetConfirmResult,
  PasswordResetError,
  PasswordResetRequestResult,
  PasswordResetService,
} from './password-reset.service.interface';
import { PasswordResetConfirmErrorCode, PasswordResetRequestErrorCode } from './password-reset.service.interface';

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

export class PasswordResetServiceImpl implements PasswordResetService {
  async requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
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
