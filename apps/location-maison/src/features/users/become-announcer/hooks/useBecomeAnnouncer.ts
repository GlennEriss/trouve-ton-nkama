'use client';

import { createLogger } from '@/lib/logger';
import type { Role } from '@/models/authentication';
import { useSession } from 'next-auth/react';
import { useCallback, useState } from 'react';
import {
  becomeAnnouncerService,
  BecomeAnnouncerErrorCode,
  type BecomeAnnouncerData,
  type BecomeAnnouncerResult,
} from '../services';

type BecomeAnnouncerUiError = {
  code: string;
  title: string;
  message: string;
  duration: number;
};

type UseBecomeAnnouncerReturn = {
  becomeAnnouncer: (data: BecomeAnnouncerData) => Promise<BecomeAnnouncerResult>;
  isLoading: boolean;
  lastError: BecomeAnnouncerUiError | null;
  clearError: () => void;
};

const logger = createLogger('users.become-announcer.hook');

const DEFAULT_ERROR: BecomeAnnouncerUiError = {
  code: BecomeAnnouncerErrorCode.UNKNOWN_ERROR,
  title: 'Erreur',
  message: "Une erreur inattendue est survenue.",
  duration: 7000,
};

const ERROR_MAP: Record<string, BecomeAnnouncerUiError> = {
  [BecomeAnnouncerErrorCode.UNAUTHENTICATED]: {
    code: BecomeAnnouncerErrorCode.UNAUTHENTICATED,
    title: 'Session expirée',
    message: 'Reconnectez-vous puis réessayez.',
    duration: 7000,
  },
  [BecomeAnnouncerErrorCode.FORBIDDEN_ROLE_STATE]: {
    code: BecomeAnnouncerErrorCode.FORBIDDEN_ROLE_STATE,
    title: 'Transition refusée',
    message: "Le compte doit avoir le rôle utilisateur pour devenir annonceur.",
    duration: 7000,
  },
  [BecomeAnnouncerErrorCode.ANNOUNCER_TERMS_REQUIRED]: {
    code: BecomeAnnouncerErrorCode.ANNOUNCER_TERMS_REQUIRED,
    title: 'Conditions annonceur requises',
    message: "Vous devez accepter les conditions d'annonceur pour continuer.",
    duration: 7000,
  },
  [BecomeAnnouncerErrorCode.USER_NOT_FOUND]: {
    code: BecomeAnnouncerErrorCode.USER_NOT_FOUND,
    title: 'Compte introuvable',
    message: 'Votre compte est introuvable. Reconnectez-vous.',
    duration: 7000,
  },
  [BecomeAnnouncerErrorCode.PERSISTENCE_ERROR]: {
    code: BecomeAnnouncerErrorCode.PERSISTENCE_ERROR,
    title: 'Mise à jour impossible',
    message: "Impossible d'activer le mode annonceur pour le moment.",
    duration: 7000,
  },
  [BecomeAnnouncerErrorCode.SESSION_SYNC_ERROR]: {
    code: BecomeAnnouncerErrorCode.SESSION_SYNC_ERROR,
    title: 'Session à synchroniser',
    message: 'Le rôle a été mis à jour mais la session locale doit être rafraîchie.',
    duration: 7000,
  },
};

function mapUiError(code?: string): BecomeAnnouncerUiError {
  if (!code) {
    return DEFAULT_ERROR;
  }
  return ERROR_MAP[code] ?? { ...DEFAULT_ERROR, code };
}

function mergeSessionUserWithAnnouncerRole<T extends { metadata?: unknown }>(
  user: T,
  roles: Role[],
  metadata?: Record<string, unknown>
) {
  const currentMetadata =
    typeof user.metadata === 'object' && user.metadata !== null
      ? (user.metadata as Record<string, unknown>)
      : {};

  return {
    ...user,
    roles,
    metadata: {
      ...currentMetadata,
      ...(metadata ?? {}),
    },
  };
}

export function useBecomeAnnouncer(): UseBecomeAnnouncerReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<BecomeAnnouncerUiError | null>(null);
  const { data: session, update } = useSession();

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const becomeAnnouncer = useCallback(
    async (data: BecomeAnnouncerData): Promise<BecomeAnnouncerResult> => {
      setIsLoading(true);
      setLastError(null);

      try {
        const result = await becomeAnnouncerService.becomeAnnouncer(data);
        if (!result.success) {
          const mappedError = mapUiError(result.error?.code);
          setLastError(mappedError);
          logger.warn('Become announcer rejected', {
            code: result.error?.code,
          });
          return result;
        }

        if (result.roles && session?.user && typeof session.user === 'object') {
          try {
            const nextSessionUser = mergeSessionUserWithAnnouncerRole(session.user, result.roles, result.metadata);
            await update({
              ...session,
              user: nextSessionUser,
            });
          } catch (error) {
            logger.warn('Session sync failed after become announcer success', {
              error,
            });
            const uiError = mapUiError(BecomeAnnouncerErrorCode.SESSION_SYNC_ERROR);
            setLastError(uiError);
            return {
              success: false,
              error: {
                code: BecomeAnnouncerErrorCode.SESSION_SYNC_ERROR,
                message: uiError.message,
              },
            };
          }
        }

        logger.info('Become announcer hook completed', {
          code: result.code,
          roles: result.roles,
        });
        return result;
      } catch (error) {
        logger.error('Become announcer hook crashed', {
          error,
        });
        const fallbackError = mapUiError();
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
    },
    [session, update]
  );

  return {
    becomeAnnouncer,
    isLoading,
    lastError,
    clearError,
  };
}
