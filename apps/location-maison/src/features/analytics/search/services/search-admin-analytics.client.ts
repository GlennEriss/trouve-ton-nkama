'use client';

import { createLogger } from '@/lib/logger';

const logger = createLogger('analytics.search-admin-client');

const SEARCH_ANALYTICS_ENDPOINT = '/api/analytics/search';
const EMIT_DEBOUNCE_MS = 550;
const DEDUP_WINDOW_MS = 20_000;
const LAST_EVENT_STORAGE_KEY = 'ttn_admin_search_analytics_last_event';
const SESSION_STORAGE_KEY = 'ttn_admin_search_analytics_session_id';

const TECHNICAL_QUERY_KEYS = new Set(['searchSource']);
const SEARCH_INTENT_KEYS = new Set([
  'query',
  'q',
  'province',
  'city',
  'street',
  'district',
  'minPrice',
  'maxPrice',
  'minArea',
  'maxArea',
  'minNbrRooms',
  'maxNbrRooms',
  'typeProperty',
  'status',
  'tags',
]);

type SearchSource = 'catalog_search_page' | 'location_maison_search_bar';

type TrackSearchAnalyticsInput = {
  searchParams: URLSearchParams;
  nbHits: number;
  searchStatus: string;
  actor: {
    uid: string | null;
    isAuthenticated: boolean;
  };
};

type QueryValue = string | string[];

let pendingTimer: number | null = null;
let inMemoryLastSignature: string | null = null;
let inMemoryLastAt = 0;

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

function getSessionId() {
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

function getSource(searchParams: URLSearchParams): SearchSource {
  const raw = searchParams.get('searchSource')?.trim();
  if (raw === 'location_maison_search_bar') {
    return raw;
  }
  return 'catalog_search_page';
}

function queryParamToRecord(searchParams: URLSearchParams): Record<string, QueryValue> {
  const keys = Array.from(new Set(Array.from(searchParams.keys()))).sort((a, b) =>
    a.localeCompare(b),
  );
  const payload: Record<string, QueryValue> = {};

  for (const key of keys) {
    if (TECHNICAL_QUERY_KEYS.has(key)) {
      continue;
    }

    const values = searchParams
      .getAll(key)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (values.length === 0) {
      continue;
    }

    payload[key] = values.length === 1 ? values[0] : values;
  }

  return payload;
}

function hasSearchIntent(queryParams: Record<string, QueryValue>) {
  return Object.keys(queryParams).some((key) => SEARCH_INTENT_KEYS.has(key));
}

function getQueryText(queryParams: Record<string, QueryValue>) {
  const direct = queryParams.query ?? queryParams.q;
  if (typeof direct === 'string') {
    return direct;
  }
  if (Array.isArray(direct)) {
    return direct[0];
  }
  return undefined;
}

function getStoredLastEvent(): { signature: string; at: number } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(LAST_EVENT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { signature?: unknown; at?: unknown };
    if (
      typeof parsed.signature !== 'string' ||
      typeof parsed.at !== 'number' ||
      !Number.isFinite(parsed.at)
    ) {
      return null;
    }
    return { signature: parsed.signature, at: parsed.at };
  } catch {
    return null;
  }
}

function setStoredLastEvent(signature: string, at: number) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    LAST_EVENT_STORAGE_KEY,
    JSON.stringify({
      signature,
      at,
    }),
  );
}

function wasRecentlyTracked(signature: string, now: number) {
  if (
    inMemoryLastSignature === signature &&
    now - inMemoryLastAt >= 0 &&
    now - inMemoryLastAt < DEDUP_WINDOW_MS
  ) {
    return true;
  }

  const stored = getStoredLastEvent();
  if (!stored) {
    return false;
  }

  if (stored.signature !== signature) {
    return false;
  }

  return now - stored.at >= 0 && now - stored.at < DEDUP_WINDOW_MS;
}

function trackCommit(signature: string, now: number) {
  inMemoryLastSignature = signature;
  inMemoryLastAt = now;
  setStoredLastEvent(signature, now);
}

export function trackSearchAnalytics(input: TrackSearchAnalyticsInput) {
  if (input.searchStatus !== 'idle') {
    return;
  }

  if (!Number.isFinite(input.nbHits) || input.nbHits < 0) {
    return;
  }

  const queryParams = queryParamToRecord(input.searchParams);
  if (!hasSearchIntent(queryParams)) {
    return;
  }

  const source = getSource(input.searchParams);
  const normalizedNbHits = Math.max(0, Math.trunc(input.nbHits));
  const signature = JSON.stringify({
    source,
    nbHits: normalizedNbHits,
    queryParams,
  });
  const now = Date.now();

  if (wasRecentlyTracked(signature, now)) {
    return;
  }

  if (pendingTimer !== null) {
    window.clearTimeout(pendingTimer);
  }

  pendingTimer = window.setTimeout(() => {
    const sendAt = Date.now();
    const nowIso = new Date(sendAt).toISOString();

    const body = {
      sent_at: nowIso,
      occurred_at: nowIso,
      environment: resolveEnvironment(),
      actor: {
        actor_type: 'user' as const,
        actor_id: input.actor.uid ?? undefined,
        is_authenticated: input.actor.isAuthenticated,
      },
      session: {
        session_id: getSessionId(),
      },
      search: {
        source,
        query_text_raw: getQueryText(queryParams),
        query_params: queryParams,
      },
      result: {
        results_count: normalizedNbHits,
        engine: 'algolia',
      },
    };

    void fetch(SEARCH_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      keepalive: true,
    })
      .then(async (response) => {
        if (response.ok) {
          trackCommit(signature, sendAt);
          return;
        }

        const payload = await response
          .json()
          .catch(() => ({ message: 'Réponse non JSON de la route analytics locale.' }));

        logger.warn('Local search analytics API rejected event', {
          status: response.status,
          payload,
        });
      })
      .catch((error) => {
        logger.warn('Local search analytics API request failed', {
          error,
        });
      });
  }, EMIT_DEBOUNCE_MS);
}

