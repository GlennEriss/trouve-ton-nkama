'use client';

import { useCallback, useEffect, useState } from 'react';
import { createLogger } from '@/lib/logger';
import { passwordResetService } from '../services/password-reset.service';
import { PasswordResetRequestErrorCode } from '../services/password-reset.service.interface';

export interface PasswordResetUiError {
  code: string;
  title: string;
  message: string;
  duration: number;
}

export interface UsePasswordResetRequestReturn {
  requestReset: (email: string) => Promise<boolean>;
  resetState: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  submittedEmail: string | null;
  isRateLimited: boolean;
  countdown: number;
  lastError: PasswordResetUiError | null;
}

const logger = createLogger('auth.use-password-reset-request');

const DEFAULT_REQUEST_ERROR: PasswordResetUiError = {
  code: PasswordResetRequestErrorCode.UNKNOWN_ERROR,
  title: 'Erreur',
  message: "Impossible d'envoyer l'email de réinitialisation.",
  duration: 6000,
};

const REQUEST_ERROR_MAP: Record<string, PasswordResetUiError> = {
  [PasswordResetRequestErrorCode.INVALID_EMAIL]: {
    code: PasswordResetRequestErrorCode.INVALID_EMAIL,
    title: 'Email invalide',
    message: "L'adresse email saisie n'est pas valide.",
    duration: 5000,
  },
  [PasswordResetRequestErrorCode.USER_NOT_FOUND]: {
    code: PasswordResetRequestErrorCode.USER_NOT_FOUND,
    title: 'Compte non trouvé',
    message: "Aucun compte n'est associé à cette adresse email.",
    duration: 6000,
  },
  [PasswordResetRequestErrorCode.USER_DISABLED]: {
    code: PasswordResetRequestErrorCode.USER_DISABLED,
    title: 'Compte désactivé',
    message: 'Ce compte a été désactivé. Veuillez contacter le support.',
    duration: 7000,
  },
  [PasswordResetRequestErrorCode.RATE_LIMIT_EXCEEDED]: {
    code: PasswordResetRequestErrorCode.RATE_LIMIT_EXCEEDED,
    title: 'Trop de tentatives',
    message: 'Veuillez patienter avant de faire une nouvelle demande.',
    duration: 8000,
  },
  [PasswordResetRequestErrorCode.SERVICE_UNAVAILABLE]: {
    code: PasswordResetRequestErrorCode.SERVICE_UNAVAILABLE,
    title: 'Service indisponible',
    message: 'Le service est momentanément indisponible. Réessayez plus tard.',
    duration: 7000,
  },
  [PasswordResetRequestErrorCode.NETWORK_ERROR]: {
    code: PasswordResetRequestErrorCode.NETWORK_ERROR,
    title: 'Erreur réseau',
    message: 'Impossible de contacter le serveur. Vérifiez votre connexion internet.',
    duration: 6000,
  },
};

export function mapPasswordResetRequestError(code?: string | null, fallbackMessage?: string): PasswordResetUiError {
  if (!code) {
    return fallbackMessage ? { ...DEFAULT_REQUEST_ERROR, message: fallbackMessage } : DEFAULT_REQUEST_ERROR;
  }

  const mapped = REQUEST_ERROR_MAP[code];
  if (mapped) {
    return fallbackMessage ? { ...mapped, message: fallbackMessage } : mapped;
  }

  return {
    ...DEFAULT_REQUEST_ERROR,
    code,
    ...(fallbackMessage ? { message: fallbackMessage } : {}),
  };
}

export function usePasswordResetRequest(): UsePasswordResetRequestReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [lastError, setLastError] = useState<PasswordResetUiError | null>(null);

  useEffect(() => {
    if (!isRateLimited || countdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          setIsRateLimited(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [countdown, isRateLimited]);

  const requestReset = useCallback(async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setLastError(null);

    const result = await passwordResetService.requestPasswordReset(email);
    setIsLoading(false);

    if (result.success) {
      setIsSuccess(true);
      setSubmittedEmail(email);
      setIsRateLimited(false);
      setCountdown(0);
      logger.info('Password reset request completed', { email });
      return true;
    }

    const uiError = mapPasswordResetRequestError(result.error?.code, result.error?.message);
    setLastError(uiError);

    if (uiError.code === PasswordResetRequestErrorCode.RATE_LIMIT_EXCEEDED) {
      const retryAfter = typeof result.retryAfter === 'number' ? result.retryAfter : 300;
      setIsRateLimited(true);
      setCountdown(retryAfter);
    }

    logger.warn('Password reset request failed in hook', {
      email,
      code: uiError.code,
      retryAfter: result.retryAfter,
    });
    return false;
  }, []);

  const resetState = useCallback(() => {
    setIsLoading(false);
    setIsSuccess(false);
    setSubmittedEmail(null);
    setIsRateLimited(false);
    setCountdown(0);
    setLastError(null);
  }, []);

  return {
    requestReset,
    resetState,
    isLoading,
    isSuccess,
    submittedEmail,
    isRateLimited,
    countdown,
    lastError,
  };
}
