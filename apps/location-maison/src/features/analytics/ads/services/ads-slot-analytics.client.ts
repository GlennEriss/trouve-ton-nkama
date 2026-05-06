'use client';

import { createLogger } from '@/lib/logger';
import {
  getPresenceSessionId,
  resolvePresenceSource,
} from '@/features/analytics/presence/services/presence-admin-analytics.client';

const logger = createLogger('analytics.ads-slot-client');

const ADS_SLOT_ANALYTICS_ENDPOINT = '/api/analytics/ads/slot-events';
const DEDUP_WINDOW_MS = 15_000;
const recentEvents = new Map<string, number>();

type SlotEventName =
  | 'ad_slot_rendered'
  | 'ad_request_sent'
  | 'ad_filled'
  | 'ad_impression'
  | 'ad_click';

type EmitAdsSlotEventInput = {
  slotId: string;
  slotKey: string;
  eventName: SlotEventName;
  pathname: string;
  latencyMs?: number;
  actor?: {
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

function inferPageTemplate(pathname: string) {
  if (pathname === '/') {
    return 'home';
  }
  if (pathname.startsWith('/search-with-ia')) {
    return 'search_with_ia';
  }
  if (pathname.startsWith('/search')) {
    return 'catalog_search';
  }
  if (pathname.startsWith('/property')) {
    return 'property_detail';
  }
  if (pathname.startsWith('/announcer')) {
    return 'announcer_space';
  }
  return 'other';
}

function inferSlotPosition(slotKey: string) {
  const normalized = slotKey.toLowerCase();
  if (normalized.includes('footer')) {
    return 'footer';
  }
  if (normalized.includes('search')) {
    return 'in_feed';
  }
  if (normalized.includes('property')) {
    return 'detail_inline';
  }
  if (normalized.includes('mobile')) {
    return 'mobile_inline';
  }
  return 'unknown';
}

function cleanupRecentEvents(now: number) {
  for (const [key, timestamp] of recentEvents.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      recentEvents.delete(key);
    }
  }
}

function shouldSkip(signature: string, now: number) {
  cleanupRecentEvents(now);
  const seenAt = recentEvents.get(signature);
  return typeof seenAt === 'number' && now - seenAt >= 0 && now - seenAt < DEDUP_WINDOW_MS;
}

function markSent(signature: string, now: number) {
  recentEvents.set(signature, now);
}

export function emitAdsSlotEvent(input: EmitAdsSlotEventInput) {
  if (!input.slotId || !input.slotKey) {
    return;
  }

  const now = Date.now();
  const signature = [
    input.eventName,
    input.slotId,
    input.slotKey,
    input.pathname,
  ].join(':');

  if (shouldSkip(signature, now)) {
    return;
  }

  markSent(signature, now);

  const nowIso = new Date(now).toISOString();
  const sessionId = getPresenceSessionId();

  const body = {
    sent_at: nowIso,
    occurred_at: nowIso,
    environment: resolveEnvironment(),
    source: resolvePresenceSource(input.pathname),
    actor: {
      actor_type: 'user' as const,
      actor_id: input.actor?.uid ?? undefined,
      is_authenticated: input.actor?.isAuthenticated ?? false,
    },
    session: {
      session_id: sessionId,
    },
    events: [
      {
        event_name: input.eventName,
        occurred_at: nowIso,
        page_path: input.pathname,
        page_template: inferPageTemplate(input.pathname),
        slot_id: input.slotId,
        slot_position: inferSlotPosition(input.slotKey),
        latency_ms:
          typeof input.latencyMs === 'number' && Number.isFinite(input.latencyMs)
            ? Math.max(0, Math.trunc(input.latencyMs))
            : undefined,
        device_category: /mobile/i.test(navigator.userAgent)
          ? ('mobile' as const)
          : ('desktop' as const),
      },
    ],
  };

  void fetch(ADS_SLOT_ANALYTICS_ENDPOINT, {
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
        .catch(() => ({ message: 'Réponse non JSON de la route analytics ads slot.' }));

      logger.warn('Local ads slot analytics API rejected event', {
        status: response.status,
        payload,
      });
    })
    .catch((error) => {
      logger.warn('Local ads slot analytics API request failed', {
        error,
      });
    });
}

