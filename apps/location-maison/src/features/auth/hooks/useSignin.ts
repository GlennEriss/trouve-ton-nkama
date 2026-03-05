'use client';

import { routes } from '@/constantes/routes';
import { createLogger } from '@/lib/logger';
import { signIn } from 'next-auth/react';
import { useCallback, useState } from 'react';

export interface SigninCredentials {
  email: string;
  password: string;
}

export interface SigninError {
  code: string;
  title: string;
  message: string;
  duration: number;
}

export interface SigninResult {
  success: boolean;
  error?: SigninError;
}

export interface UseSigninReturn {
  signinWithCredentials: (credentials: SigninCredentials) => Promise<SigninResult>;
  signinWithGoogle: () => Promise<void>;
  isCredentialsLoading: boolean;
  isGoogleLoading: boolean;
  isLoading: boolean;
  lastError: SigninError | null;
  clearError: () => void;
}

const logger = createLogger('auth.use-signin');

const DEFAULT_SIGNIN_ERROR: SigninError = {
  code: 'SIGNIN_FAILED',
  title: 'Erreur de connexion',
  message: 'Email ou mot de passe incorrect.',
  duration: 5000,
};

const SIGNIN_ERROR_MAP: Record<string, SigninError> = {
  'Email is not verified': {
    code: 'EMAIL_NOT_VERIFIED',
    title: 'Email non vérifié',
    message:
      'Veuillez vérifier votre email avant de vous connecter. Vérifiez votre boîte de réception et cliquez sur le lien de vérification.',
    duration: 7000,
  },
  'auth/user-not-found': {
    code: 'USER_NOT_FOUND',
    title: 'Compte non trouvé',
    message: 'Aucun compte associé à cette adresse email.',
    duration: 5000,
  },
  'auth/wrong-password': {
    code: 'WRONG_PASSWORD',
    title: 'Mot de passe incorrect',
    message: 'Mot de passe incorrect.',
    duration: 5000,
  },
  'auth/invalid-email': {
    code: 'INVALID_EMAIL',
    title: 'Email invalide',
    message: "Format d'email invalide.",
    duration: 5000,
  },
  'auth/user-disabled': {
    code: 'USER_DISABLED',
    title: 'Compte désactivé',
    message: 'Ce compte a été désactivé. Veuillez contacter le support.',
    duration: 5000,
  },
  'auth/too-many-requests': {
    code: 'TOO_MANY_REQUESTS',
    title: 'Trop de tentatives',
    message:
      'Trop de tentatives de connexion. Veuillez attendre quelques minutes avant de réessayer.',
    duration: 8000,
  },
  'auth/network-request-failed': {
    code: 'NETWORK_ERROR',
    title: 'Erreur réseau',
    message: 'Erreur de connexion réseau. Vérifiez votre connexion internet.',
    duration: 5000,
  },
  wrong_provider: {
    code: 'WRONG_PROVIDER',
    title: 'Mode de connexion incorrect',
    message:
      'Ce compte est associé à un autre mode de connexion. Connectez-vous avec votre méthode initiale puis liez vos providers dans Login & Security.',
    duration: 7000,
  },
  google_provider_disabled: {
    code: 'GOOGLE_PROVIDER_DISABLED',
    title: 'Google indisponible',
    message:
      'Connexion Google indisponible sur cet environnement. Activez Google provider dans Firebase Authentication.',
    duration: 7000,
  },
  google_signin_failed: {
    code: 'GOOGLE_SIGNIN_FAILED',
    title: 'Erreur Google',
    message:
      'La connexion Google a échoué. Réessayez, ou connectez-vous avec email/mot de passe.',
    duration: 7000,
  },
  facebook_provider_disabled: {
    code: 'FACEBOOK_PROVIDER_DISABLED',
    title: 'Facebook indisponible',
    message:
      'Connexion Facebook indisponible sur cet environnement. Activez Facebook provider dans Firebase Authentication.',
    duration: 7000,
  },
  facebook_signin_failed: {
    code: 'FACEBOOK_SIGNIN_FAILED',
    title: 'Erreur Facebook',
    message:
      'La connexion Facebook a échoué. Réessayez, ou connectez-vous avec email/mot de passe.',
    duration: 7000,
  },
  facebook_missing_access_token: {
    code: 'FACEBOOK_ACCESS_TOKEN_MISSING',
    title: 'Erreur Facebook',
    message: 'Token Facebook manquant. Réessayez la connexion.',
    duration: 7000,
  },
  signin_callback_failed: {
    code: 'SIGNIN_CALLBACK_FAILED',
    title: 'Erreur de connexion',
    message: 'Une erreur interne est survenue pendant la connexion.',
    duration: 7000,
  },
  AccessDenied: {
    code: 'ACCESS_DENIED',
    title: 'Accès refusé',
    message: "Connexion refusée. Vérifiez votre méthode d'authentification.",
    duration: 7000,
  },
};

export function mapSigninError(errorCode?: string | null): SigninError {
  if (!errorCode) {
    return DEFAULT_SIGNIN_ERROR;
  }
  return SIGNIN_ERROR_MAP[errorCode] ?? {
    ...DEFAULT_SIGNIN_ERROR,
    code: errorCode,
  };
}

export function useSignin(): UseSigninReturn {
  const [isCredentialsLoading, setIsCredentialsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [lastError, setLastError] = useState<SigninError | null>(null);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const signinWithCredentials = useCallback(
    async (credentials: SigninCredentials): Promise<SigninResult> => {
      setIsCredentialsLoading(true);
      setLastError(null);

      try {
        const result = await signIn('credentials', {
          login: credentials.email,
          password: credentials.password,
          redirect: false,
        });

        if (!result?.ok || result?.error) {
          const mappedError = mapSigninError(result?.error);
          logger.warn('Credentials signin rejected', {
            email: credentials.email,
            rawError: result?.error,
            mappedErrorCode: mappedError.code,
          });
          setLastError(mappedError);
          return {
            success: false,
            error: mappedError,
          };
        }

        logger.info('Credentials signin succeeded', {
          email: credentials.email,
        });
        return { success: true };
      } catch (error) {
        logger.error('Credentials signin crashed', {
          email: credentials.email,
          error,
        });
        const mappedError = mapSigninError();
        setLastError(mappedError);
        return {
          success: false,
          error: mappedError,
        };
      } finally {
        setIsCredentialsLoading(false);
      }
    },
    []
  );

  const signinWithGoogle = useCallback(async () => {
    setIsGoogleLoading(true);
    setLastError(null);

    try {
      await signIn('google', {
        callbackUrl: routes.protected.properties,
      });
    } catch (error) {
      logger.error('Google signin trigger failed', { error });
      setLastError(mapSigninError('google_signin_failed'));
    } finally {
      setIsGoogleLoading(false);
    }
  }, []);

  return {
    signinWithCredentials,
    signinWithGoogle,
    isCredentialsLoading,
    isGoogleLoading,
    isLoading: isCredentialsLoading || isGoogleLoading,
    lastError,
    clearError,
  };
}
