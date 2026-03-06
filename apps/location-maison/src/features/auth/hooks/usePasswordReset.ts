'use client';

import { useCallback, useMemo, useState } from 'react';
import { createLogger } from '@/lib/logger';
import { passwordResetService } from '../services/password-reset.service';
import { PasswordResetConfirmErrorCode } from '../services/password-reset.service.interface';
import type { PasswordResetUiError } from './usePasswordResetRequest';

export interface UsePasswordResetReturn {
  confirmReset: (oobCode: string | null, newPassword: string) => Promise<boolean>;
  clearError: () => void;
  resetState: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  lastError: PasswordResetUiError | null;
  shouldRedirectToFailure: boolean;
}

const logger = createLogger('auth.use-password-reset');

const DEFAULT_CONFIRM_ERROR: PasswordResetUiError = {
  code: PasswordResetConfirmErrorCode.UNKNOWN_ERROR,
  title: 'Erreur',
  message: 'Une erreur est survenue pendant la réinitialisation.',
  duration: 6000,
};

const CONFIRM_ERROR_MAP: Record<string, PasswordResetUiError> = {
  [PasswordResetConfirmErrorCode.MISSING_OOB_CODE]: {
    code: PasswordResetConfirmErrorCode.MISSING_OOB_CODE,
    title: 'Lien invalide',
    message: 'Le lien de réinitialisation est invalide.',
    duration: 6000,
  },
  [PasswordResetConfirmErrorCode.EXPIRED_OOB_CODE]: {
    code: PasswordResetConfirmErrorCode.EXPIRED_OOB_CODE,
    title: 'Lien expiré',
    message: 'Le lien de réinitialisation a expiré.',
    duration: 6000,
  },
  [PasswordResetConfirmErrorCode.INVALID_OOB_CODE]: {
    code: PasswordResetConfirmErrorCode.INVALID_OOB_CODE,
    title: 'Lien invalide',
    message: "Ce lien de réinitialisation n'est plus valide.",
    duration: 6000,
  },
  [PasswordResetConfirmErrorCode.WEAK_PASSWORD]: {
    code: PasswordResetConfirmErrorCode.WEAK_PASSWORD,
    title: 'Mot de passe faible',
    message: 'Le mot de passe est trop faible.',
    duration: 6000,
  },
  [PasswordResetConfirmErrorCode.NETWORK_ERROR]: {
    code: PasswordResetConfirmErrorCode.NETWORK_ERROR,
    title: 'Erreur réseau',
    message: 'Impossible de contacter le serveur. Vérifiez votre connexion internet.',
    duration: 6000,
  },
};

export function mapPasswordResetConfirmError(code?: string | null, fallbackMessage?: string): PasswordResetUiError {
  if (!code) {
    return fallbackMessage ? { ...DEFAULT_CONFIRM_ERROR, message: fallbackMessage } : DEFAULT_CONFIRM_ERROR;
  }

  const mapped = CONFIRM_ERROR_MAP[code];
  if (mapped) {
    return fallbackMessage ? { ...mapped, message: fallbackMessage } : mapped;
  }

  return {
    ...DEFAULT_CONFIRM_ERROR,
    code,
    ...(fallbackMessage ? { message: fallbackMessage } : {}),
  };
}

export function usePasswordReset(): UsePasswordResetReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastError, setLastError] = useState<PasswordResetUiError | null>(null);

  const confirmReset = useCallback(async (oobCode: string | null, newPassword: string): Promise<boolean> => {
    setIsLoading(true);
    setLastError(null);

    const result = await passwordResetService.confirmPasswordReset(oobCode ?? '', newPassword);
    setIsLoading(false);

    if (result.success) {
      setIsSuccess(true);
      logger.info('Password reset confirmed');
      return true;
    }

    const uiError = mapPasswordResetConfirmError(result.error?.code, result.error?.message);
    setLastError(uiError);
    logger.warn('Password reset confirmation failed in hook', {
      code: uiError.code,
    });
    return false;
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const resetState = useCallback(() => {
    setIsLoading(false);
    setIsSuccess(false);
    setLastError(null);
  }, []);

  const shouldRedirectToFailure = useMemo(
    () =>
      lastError?.code === PasswordResetConfirmErrorCode.MISSING_OOB_CODE ||
      lastError?.code === PasswordResetConfirmErrorCode.EXPIRED_OOB_CODE ||
      lastError?.code === PasswordResetConfirmErrorCode.INVALID_OOB_CODE,
    [lastError?.code]
  );

  return {
    confirmReset,
    clearError,
    resetState,
    isLoading,
    isSuccess,
    lastError,
    shouldRedirectToFailure,
  };
}
