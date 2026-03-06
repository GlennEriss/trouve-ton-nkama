'use client';

import { useCallback, useState } from 'react';
import { createLogger } from '@/lib/logger';
import type {
  CompleteProfileData,
  CompleteProfileResult,
} from '../services/complete-profile.service.interface';
import { completeProfileService, CompleteProfileErrorCode } from '../services';

export interface CompleteProfileUiError {
  code: string;
  title: string;
  message: string;
  duration: number;
}

export interface UseCompleteProfileReturn {
  completeProfile: (data: CompleteProfileData) => Promise<CompleteProfileResult>;
  isLoading: boolean;
  lastError: CompleteProfileUiError | null;
  clearError: () => void;
}

const logger = createLogger('auth.use-complete-profile');

const DEFAULT_ERROR: CompleteProfileUiError = {
  code: CompleteProfileErrorCode.UNKNOWN_ERROR,
  title: 'Erreur',
  message: "Une erreur inattendue est survenue pendant la finalisation du profil.",
  duration: 6000,
};

const ERROR_MAP: Record<string, CompleteProfileUiError> = {
  [CompleteProfileErrorCode.USER_ID_REQUIRED]: {
    code: CompleteProfileErrorCode.USER_ID_REQUIRED,
    title: 'Session invalide',
    message: "Impossible d'identifier votre compte. Reconnectez-vous et réessayez.",
    duration: 7000,
  },
  [CompleteProfileErrorCode.INVALID_PHONE]: {
    code: CompleteProfileErrorCode.INVALID_PHONE,
    title: 'Téléphone invalide',
    message: 'Veuillez saisir un numéro de téléphone valide.',
    duration: 6000,
  },
  [CompleteProfileErrorCode.INVALID_BIRTHDATE]: {
    code: CompleteProfileErrorCode.INVALID_BIRTHDATE,
    title: 'Date invalide',
    message: 'La date de naissance saisie est invalide.',
    duration: 6000,
  },
  [CompleteProfileErrorCode.UNDERAGE]: {
    code: CompleteProfileErrorCode.UNDERAGE,
    title: 'Âge non autorisé',
    message: 'Vous devez avoir au moins 18 ans pour finaliser le compte.',
    duration: 7000,
  },
  [CompleteProfileErrorCode.TERMS_NOT_ACCEPTED]: {
    code: CompleteProfileErrorCode.TERMS_NOT_ACCEPTED,
    title: 'Conditions requises',
    message: "Vous devez accepter les conditions d'utilisation et la politique de confidentialité.",
    duration: 7000,
  },
  [CompleteProfileErrorCode.ANNOUNCER_TERMS_NOT_ACCEPTED]: {
    code: CompleteProfileErrorCode.ANNOUNCER_TERMS_NOT_ACCEPTED,
    title: 'Conditions annonceur',
    message: "Vous devez accepter les conditions annonceur pour ce type de compte.",
    duration: 7000,
  },
  [CompleteProfileErrorCode.USER_NOT_FOUND]: {
    code: CompleteProfileErrorCode.USER_NOT_FOUND,
    title: 'Compte introuvable',
    message: 'Le compte utilisateur est introuvable. Reconnectez-vous.',
    duration: 7000,
  },
  [CompleteProfileErrorCode.UPDATE_FAILED]: {
    code: CompleteProfileErrorCode.UPDATE_FAILED,
    title: 'Mise à jour échouée',
    message: 'Impossible de sauvegarder votre profil pour le moment.',
    duration: 6000,
  },
};

export function mapCompleteProfileError(errorCode?: string): CompleteProfileUiError {
  if (!errorCode) {
    return DEFAULT_ERROR;
  }
  return ERROR_MAP[errorCode] ?? { ...DEFAULT_ERROR, code: errorCode };
}

export function useCompleteProfile(): UseCompleteProfileReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<CompleteProfileUiError | null>(null);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const completeProfile = useCallback(async (data: CompleteProfileData): Promise<CompleteProfileResult> => {
    setIsLoading(true);
    setLastError(null);

    try {
      const result = await completeProfileService.completeProfile(data);
      if (!result.success) {
        const mappedError = mapCompleteProfileError(result.error?.code);
        setLastError(mappedError);
        logger.warn('Complete profile rejected', {
          uid: data.uid,
          errorCode: result.error?.code,
        });
      }
      return result;
    } catch (error) {
      logger.error('Complete profile crashed in hook', {
        uid: data.uid,
        error,
      });
      const fallbackError = mapCompleteProfileError();
      setLastError(fallbackError);
      return {
        success: false,
        error: {
          code: fallbackError.code,
          message: fallbackError.message,
        },
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    completeProfile,
    isLoading,
    lastError,
    clearError,
  };
}
