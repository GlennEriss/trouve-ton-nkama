'use client';

import { createLogger } from '@/lib/logger';
import {
  getFirebaseAnalytics,
  logEvent,
  setUserId,
  setUserProperties,
  setAnalyticsCollectionEnabled,
} from '@/firebase/analytics';
import {
  trackingEvents,
  type TrackingEventName,
  type TrackingRoleContext,
} from '../domain/events';

const logger = createLogger('analytics.tracker-service');
const SESSION_ID_STORAGE_KEY = 'ttn_analytics_session_id';

type TrackingPrimitive = string | number | boolean;
type TrackingParams = Record<string, TrackingPrimitive | null | undefined>;

let cachedSessionId: string | null = null;

function sanitizeParams(params: TrackingParams): Record<string, TrackingPrimitive> {
  const sanitized: Record<string, TrackingPrimitive> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'string') {
      sanitized[key] = value.trim().slice(0, 200);
      continue;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionId(): string {
  if (cachedSessionId) {
    return cachedSessionId;
  }

  if (typeof window === 'undefined') {
    cachedSessionId = createSessionId();
    return cachedSessionId;
  }

  const stored = window.sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
  if (stored) {
    cachedSessionId = stored;
    return cachedSessionId;
  }

  const generated = createSessionId();
  window.sessionStorage.setItem(SESSION_ID_STORAGE_KEY, generated);
  cachedSessionId = generated;
  return cachedSessionId;
}

function resolvePageSpecificEvent(pathname: string): TrackingEventName | null {
  if (pathname === '/') return trackingEvents.PAGE_HOME_VIEW;
  if (pathname === '/search') return trackingEvents.PAGE_SEARCH_VIEW;
  if (pathname === '/signin') return trackingEvents.PAGE_SIGNIN_VIEW;
  if (pathname === '/signup') return trackingEvents.PAGE_SIGNUP_VIEW;
  if (pathname.startsWith('/houseDetails/')) return trackingEvents.PAGE_PROPERTY_DETAILS_VIEW;
  return null;
}

export async function setTrackingUserContext(
  uid: string | null,
  roleContext: TrackingRoleContext
): Promise<void> {
  try {
    const analytics = await getFirebaseAnalytics();
    if (!analytics) {
      return;
    }

    setAnalyticsCollectionEnabled(analytics, true);
    setUserProperties(analytics, {
      role_context: roleContext,
    });

    if (uid) {
      setUserId(analytics, uid);
    }
  } catch (error) {
    logger.warn('Failed to set tracking user context', {
      uid,
      roleContext,
      error,
    });
  }
}

export async function trackEvent(
  eventName: TrackingEventName,
  params: TrackingParams = {}
): Promise<void> {
  try {
    const analytics = await getFirebaseAnalytics();
    if (!analytics) {
      return;
    }

    const payload = sanitizeParams({
      ...params,
      session_id: getSessionId(),
      app_env: process.env.NODE_ENV ?? 'unknown',
    });

    logEvent(analytics as any, eventName as string, payload as any);
  } catch (error) {
    logger.warn('Failed to track analytics event', {
      eventName,
      params,
      error,
    });
  }
}

type PageViewInput = {
  pathname: string;
  search: string;
  title?: string;
};

export async function trackPageView(input: PageViewInput): Promise<void> {
  const pagePathWithQuery = `${input.pathname}${input.search}`;
  const pageLocation =
    typeof window !== 'undefined' ? `${window.location.origin}${pagePathWithQuery}` : pagePathWithQuery;

  await trackEvent(trackingEvents.PAGE_VIEW, {
    page_path: pagePathWithQuery,
    page_location: pageLocation,
    page_title: input.title ?? '',
  });

  const specificEvent = resolvePageSpecificEvent(input.pathname);
  if (specificEvent) {
    await trackEvent(specificEvent, {
      page_path: pagePathWithQuery,
    });
  }
}
