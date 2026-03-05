'use client';

import { createLogger } from '@/lib/logger';
import { useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';

type TokenStatus = 'none' | 'valid' | 'expired' | 'refresh_failed';

export interface AuthSessionState {
  provider: 'google' | 'facebook' | null;
  accessTokenExpiresAt: number | null;
  tokenStatus: TokenStatus;
  tokenRefreshError: string | null;
  hasRefreshToken: boolean;
}

export interface UseAuthSessionReturn {
  user: any;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  isLoading: boolean;
  isAuthenticated: boolean;
  auth: AuthSessionState | null;
  tokenStatus: TokenStatus;
  tokenRefreshError: string | null;
  accessTokenExpiresAt: number | null;
  secondsUntilExpiry: number | null;
  refreshSession: () => Promise<void>;
}

const logger = createLogger('auth.use-auth-session');

const EMPTY_AUTH_STATE: AuthSessionState = {
  provider: null,
  accessTokenExpiresAt: null,
  tokenStatus: 'none',
  tokenRefreshError: null,
  hasRefreshToken: false,
};

export function useAuthSession(): UseAuthSessionReturn {
  const { data: session, status, update } = useSession();

  const auth = useMemo<AuthSessionState>(() => {
    const rawAuth = (session as any)?.auth;
    if (!rawAuth) {
      return EMPTY_AUTH_STATE;
    }

    return {
      provider: rawAuth.provider ?? null,
      accessTokenExpiresAt:
        typeof rawAuth.accessTokenExpiresAt === 'number'
          ? rawAuth.accessTokenExpiresAt
          : null,
      tokenStatus: (rawAuth.tokenStatus as TokenStatus) ?? 'none',
      tokenRefreshError:
        typeof rawAuth.tokenRefreshError === 'string'
          ? rawAuth.tokenRefreshError
          : null,
      hasRefreshToken: Boolean(rawAuth.hasRefreshToken),
    };
  }, [session]);

  const secondsUntilExpiry = useMemo(() => {
    if (!auth.accessTokenExpiresAt) {
      return null;
    }
    return Math.max(0, Math.floor((auth.accessTokenExpiresAt - Date.now()) / 1000));
  }, [auth.accessTokenExpiresAt]);

  const refreshSession = useCallback(async () => {
    try {
      await update();
      logger.info('Session refresh requested from client hook');
    } catch (error) {
      logger.warn('Session refresh failed from client hook', { error });
    }
  }, [update]);

  return {
    user: session?.user ?? null,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    auth,
    tokenStatus: auth.tokenStatus,
    tokenRefreshError: auth.tokenRefreshError,
    accessTokenExpiresAt: auth.accessTokenExpiresAt,
    secondsUntilExpiry,
    refreshSession,
  };
}
