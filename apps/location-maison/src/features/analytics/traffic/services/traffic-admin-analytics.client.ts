'use client';

import { createLogger } from '@/lib/logger';

import {
  getPresenceSessionId,
} from '@/features/analytics/presence/services/presence-admin-analytics.client';

const logger = createLogger('analytics.traffic-admin-client');

const TRAFFIC_ANALYTICS_ENDPOINT = '/api/analytics/traffic';
const VISITOR_STORAGE_KEY = 'ttn_analytics_visitor_id';
const UNIQUE_VISITOR_DAY_KEY = 'ttn_analytics_unique_visitor_day';
const VISIT_SENT_KEY = 'ttn_analytics_visit_sent';
const LAST_PAGE_SIGNATURE_KEY = 'ttn_analytics_last_page_signature';

type DeviceCategory = 'mobile' | 'desktop' | 'tablet' | 'unknown';
type TrafficMetricName = 'visit' | 'unique_visitor' | 'page_view';

type TrafficMetricEvent = {
  provider_event_id: string;
  metric_name: TrafficMetricName;
  metric_value: number;
  occurred_at: string;
  page_path: string;
  route: string;
  referrer_host?: string;
  country?: string;
  device_category: DeviceCategory;
};

type TrackTrafficPageInput = {
  pathname: string;
  actor: {
    uid: string | null;
    isAuthenticated: boolean;
  };
};

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

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

function resolveDeviceCategory(): DeviceCategory {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isTablet = /(ipad|tablet|playbook|silk)|(android(?!.*mobile))/i.test(userAgent);
  if (isTablet) {
    return 'tablet';
  }

  const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  if (isMobile) {
    return 'mobile';
  }

  return 'desktop';
}

function getVisitorId() {
  if (typeof window === 'undefined') {
    return createId('visitor');
  }

  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const generated = createId('visitor');
  window.localStorage.setItem(VISITOR_STORAGE_KEY, generated);
  return generated;
}

function toPagePath(pathname: string) {
  const trimmed = pathname.trim();
  if (!trimmed) {
    return '/';
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  return `/${trimmed}`;
}

function shouldSendVisitInSession() {
  if (typeof window === 'undefined') {
    return true;
  }
  return !window.sessionStorage.getItem(VISIT_SENT_KEY);
}

function markVisitSent() {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.setItem(VISIT_SENT_KEY, '1');
}

function shouldSendUniqueVisitor(todayKey: string) {
  if (typeof window === 'undefined') {
    return true;
  }
  const current = window.localStorage.getItem(UNIQUE_VISITOR_DAY_KEY);
  return current !== todayKey;
}

function markUniqueVisitorSent(todayKey: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(UNIQUE_VISITOR_DAY_KEY, todayKey);
}

function shouldSkipPageViewSignature(signature: string) {
  if (typeof window === 'undefined') {
    return false;
  }
  const previous = window.sessionStorage.getItem(LAST_PAGE_SIGNATURE_KEY);
  if (previous === signature) {
    return true;
  }
  window.sessionStorage.setItem(LAST_PAGE_SIGNATURE_KEY, signature);
  return false;
}

function buildCorrelationId() {
  return createId('corr_traffic');
}

function buildIdempotencyKey(sessionId: string, pagePath: string, occurredAt: string) {
  const minuteBucket = occurredAt.slice(0, 16);
  return `idem_traffic_${sessionId}_${pagePath.replace(/\W+/g, '_')}_${minuteBucket}`;
}

function getReferrerHost() {
  if (typeof document === 'undefined' || !document.referrer) {
    return undefined;
  }
  try {
    const parsed = new URL(document.referrer);
    return parsed.host || undefined;
  } catch {
    return undefined;
  }
}

async function emitTrafficEvents(input: {
  sessionId: string;
  actor: {
    uid: string | null;
    isAuthenticated: boolean;
  };
  events: TrafficMetricEvent[];
}) {
  if (input.events.length === 0) {
    return;
  }

  const sentAt = new Date().toISOString();
  const pagePath = input.events[0]?.page_path ?? '/';

  const body = {
    sent_at: sentAt,
    occurred_at: sentAt,
    environment: resolveEnvironment(),
    provider: 'vercel' as const,
    actor: {
      actor_type: 'user' as const,
      actor_id: input.actor.uid ?? undefined,
      is_authenticated: input.actor.isAuthenticated,
    },
    session: {
      session_id: input.sessionId,
    },
    visits: input.events,
  };

  return fetch(TRAFFIC_ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-Id': buildCorrelationId(),
      'X-Idempotency-Key': buildIdempotencyKey(input.sessionId, pagePath, sentAt),
    },
    body: JSON.stringify(body),
    keepalive: true,
  })
    .then(async (response) => {
      if (response.ok) {
        return;
      }

      const payload = await response
        .json()
        .catch(() => ({ message: 'Réponse non JSON de la route analytics traffic.' }));

      logger.warn('Local traffic analytics API rejected event', {
        status: response.status,
        payload,
      });
    })
    .catch((error) => {
      logger.warn('Local traffic analytics API request failed', {
        error,
      });
    });
}

export function trackTrafficPage(input: TrackTrafficPageInput) {
  if (typeof window === 'undefined') {
    return;
  }

  const pagePath = toPagePath(input.pathname);
  const signature = `${pagePath}:${document.visibilityState}`;
  if (shouldSkipPageViewSignature(signature)) {
    return;
  }

  const sessionId = getPresenceSessionId();
  const visitorId = getVisitorId();
  const nowIso = new Date().toISOString();
  const todayKey = nowIso.slice(0, 10);
  const referrerHost = getReferrerHost();
  const deviceCategory = resolveDeviceCategory();

  const events: TrafficMetricEvent[] = [
    {
      provider_event_id: createId(`page_view_${sessionId}`),
      metric_name: 'page_view',
      metric_value: 1,
      occurred_at: nowIso,
      page_path: pagePath,
      route: pagePath,
      referrer_host: referrerHost,
      device_category: deviceCategory,
    },
  ];

  if (shouldSendVisitInSession()) {
    events.push({
      provider_event_id: `visit_${sessionId}`,
      metric_name: 'visit',
      metric_value: 1,
      occurred_at: nowIso,
      page_path: pagePath,
      route: pagePath,
      referrer_host: referrerHost,
      device_category: deviceCategory,
    });
    markVisitSent();
  }

  if (shouldSendUniqueVisitor(todayKey)) {
    events.push({
      provider_event_id: `unique_visitor_${visitorId}_${todayKey}`,
      metric_name: 'unique_visitor',
      metric_value: 1,
      occurred_at: nowIso,
      page_path: pagePath,
      route: pagePath,
      referrer_host: referrerHost,
      device_category: deviceCategory,
    });
    markUniqueVisitorSent(todayKey);
  }

  void emitTrafficEvents({
    sessionId,
    actor: input.actor,
    events,
  });
}
