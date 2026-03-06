'use client';

import { createLogger } from '@/lib/logger';
import { useSession } from 'next-auth/react';
import { useCallback, useState } from 'react';
import {
  ProfileInformationErrorCode,
  profileInformationService,
  type UpdateProfileInformationData,
  type UpdateProfileInformationResult,
} from '../services';

export type ProfileInformationUiError = {
  code: string;
  title: string;
  message: string;
  duration: number;
};

type UseProfileInformationUpdateReturn = {
  updateProfileInformation: (
    data: UpdateProfileInformationData
  ) => Promise<UpdateProfileInformationResult>;
  isLoading: boolean;
  lastError: ProfileInformationUiError | null;
  clearError: () => void;
};

const logger = createLogger('users.use-profile-information-update');

const DEFAULT_ERROR: ProfileInformationUiError = {
  code: ProfileInformationErrorCode.UNKNOWN_ERROR,
  title: 'Erreur',
  message: 'Une erreur inattendue est survenue.',
  duration: 6000,
};

const ERROR_MAP: Record<string, ProfileInformationUiError> = {
  [ProfileInformationErrorCode.USER_ID_REQUIRED]: {
    code: ProfileInformationErrorCode.USER_ID_REQUIRED,
    title: 'Session invalide',
    message: "Impossible d'identifier le compte utilisateur.",
    duration: 7000,
  },
  [ProfileInformationErrorCode.FIRSTNAME_REQUIRED]: {
    code: ProfileInformationErrorCode.FIRSTNAME_REQUIRED,
    title: 'Prénom requis',
    message: 'Veuillez renseigner votre prénom.',
    duration: 6000,
  },
  [ProfileInformationErrorCode.LASTNAME_REQUIRED]: {
    code: ProfileInformationErrorCode.LASTNAME_REQUIRED,
    title: 'Nom requis',
    message: 'Veuillez renseigner votre nom.',
    duration: 6000,
  },
  [ProfileInformationErrorCode.INVALID_BIRTHDATE]: {
    code: ProfileInformationErrorCode.INVALID_BIRTHDATE,
    title: 'Date invalide',
    message: 'La date de naissance est invalide.',
    duration: 6000,
  },
  [ProfileInformationErrorCode.UNDERAGE]: {
    code: ProfileInformationErrorCode.UNDERAGE,
    title: 'Âge non autorisé',
    message: 'Vous devez avoir au moins 18 ans.',
    duration: 7000,
  },
  [ProfileInformationErrorCode.INVALID_PHONE]: {
    code: ProfileInformationErrorCode.INVALID_PHONE,
    title: 'Téléphone invalide',
    message: 'Veuillez saisir un numéro de téléphone valide.',
    duration: 6000,
  },
  [ProfileInformationErrorCode.INVALID_COUNTRY]: {
    code: ProfileInformationErrorCode.INVALID_COUNTRY,
    title: 'Pays invalide',
    message: 'Le pays sélectionné est invalide.',
    duration: 6000,
  },
  [ProfileInformationErrorCode.PHONE_ALREADY_IN_USE]: {
    code: ProfileInformationErrorCode.PHONE_ALREADY_IN_USE,
    title: 'Téléphone déjà utilisé',
    message: 'Ce numéro est déjà utilisé par un autre compte.',
    duration: 7000,
  },
  [ProfileInformationErrorCode.USER_NOT_FOUND]: {
    code: ProfileInformationErrorCode.USER_NOT_FOUND,
    title: 'Compte introuvable',
    message: 'Votre compte est introuvable. Reconnectez-vous.',
    duration: 7000,
  },
  [ProfileInformationErrorCode.UPDATE_FAILED]: {
    code: ProfileInformationErrorCode.UPDATE_FAILED,
    title: 'Mise à jour échouée',
    message: "Impossible d'enregistrer vos informations pour le moment.",
    duration: 6000,
  },
};

function mapProfileInformationError(code?: string): ProfileInformationUiError {
  if (!code) {
    return DEFAULT_ERROR;
  }

  return ERROR_MAP[code] ?? { ...DEFAULT_ERROR, code };
}

export function useProfileInformationUpdate(): UseProfileInformationUpdateReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<ProfileInformationUiError | null>(null);
  const { data: session, update } = useSession();

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const updateProfileInformation = useCallback(
    async (data: UpdateProfileInformationData): Promise<UpdateProfileInformationResult> => {
      setIsLoading(true);
      setLastError(null);

      try {
        const result = await profileInformationService.updateProfileInformation(data);
        if (!result.success) {
          const mapped = mapProfileInformationError(result.error?.code);
          setLastError(mapped);
          logger.warn('Profile information update rejected', {
            uid: data.uid,
            code: result.error?.code,
          });
          return result;
        }

        if (result.user) {
          try {
            await update({
              ...session,
              user: result.user,
            });
          } catch (error) {
            logger.warn('Failed to sync session after profile update', {
              uid: data.uid,
              error,
            });
          }
        }

        return result;
      } catch (error) {
        logger.error('Profile information update crashed', {
          uid: data.uid,
          error,
        });

        const fallbackError = mapProfileInformationError();
        setLastError(fallbackError);
        return {
          success: false,
          error: {
            code: fallbackError.code as ProfileInformationErrorCode,
            message: fallbackError.message,
          },
        };
      } finally {
        setIsLoading(false);
      }
    },
    [session, update]
  );

  return {
    updateProfileInformation,
    isLoading,
    lastError,
    clearError,
  };
}

