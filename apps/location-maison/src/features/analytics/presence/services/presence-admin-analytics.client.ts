'use client';

import { createLogger } from '@/lib/logger';

const logger = createLogger('analytics.presence-admin-client');

const PRESENCE_ANALYTICS_ENDPOINT = '/api/analytics/presence';
const SESSION_STORAGE_KEY = 'ttn_analytics_session_id';

type PresenceSource =
  | 'catalog_search_page'
  | 'location_maison_search_bar'
  | 'search_with_ia_page';

type PresenceStatus = 'online' | 'offline';

type SendPresenceInput = {
  source: PresenceSource;
  status: PresenceStatus;
  sessionId: string;
  actor: {
    uid: string | null;
    isAuthenticated: boolean;
  };
  keepalive?: boolean;
};

function resolveEnvironment(): 'dev' | 'preprod' | 'prod' {
  const raw = (process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? 'development')
    .trim()
    .toLowerCase();

  if (raw === 'production' || raw === 'prod') {
    return 'prod';
  }
  if (raw === 'preprod' || raw === 'staging') {
    return 'preprod';
  }
  return 'dev';
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getPresenceSessionId() {
  if (typeof window === 'undefined') {
    return createSessionId();
  }

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const generated = createSessionId();
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, generated);
  return generated;
}

function resolveDeviceType(): 'mobile' | 'desktop' | 'tablet' | 'unknown' {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isTablet =
    /(ipad|tablet|playbook|silk)|(android(?!.*mobile))/i.test(userAgent);
  if (isTablet) {
    return 'tablet';
  }

  const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  if (isMobile) {
    return 'mobile';
  }

  if (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) {
    return 'tablet';
  }

  return 'desktop';
}

export function resolvePresenceSource(pathname: string): PresenceSource {
  if (pathname.startsWith('/search-with-ia')) {
    return 'search_with_ia_page';
  }

  if (pathname.startsWith('/search')) {
    return 'catalog_search_page';
  }

  return 'location_maison_search_bar';
}

export async function sendPresenceHeartbeat(input: SendPresenceInput) {
  const nowIso = new Date().toISOString();

  const body = {
    sent_at: nowIso,
    occurred_at: nowIso,
    environment: resolveEnvironment(),
    source: input.source,
    actor: {
      actor_type: 'user' as const,
      actor_id: input.actor.uid ?? undefined,
      is_authenticated: input.actor.isAuthenticated,
    },
    session: {
      session_id: input.sessionId,
    },
    presence: {
      status: input.status,
      device_type: resolveDeviceType(),
    },
  };

  return fetch(PRESENCE_ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    keepalive: input.keepalive ?? false,
  })
    .then(async (response) => {
      if (response.ok) {
        return;
      }

      const payload = await response
        .json()
        .catch(() => ({ message: 'Réponse non JSON de la route analytics presence.' }));

      logger.warn('Local presence analytics API rejected event', {
        status: response.status,
        payload,
      });
    })
    .catch((error) => {
      logger.warn('Local presence analytics API request failed', {
        error,
      });
    });
}
