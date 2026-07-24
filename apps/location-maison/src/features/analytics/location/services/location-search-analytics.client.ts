'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('analytics.location-search-client')
const ENDPOINT = '/api/analytics/search'
const SESSION_KEY = 'ttn_admin_search_analytics_session_id'
const DEDUP_KEY = 'ttn_location_no_result_events'
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000

type LocationNoResultInput = {
  query: string
  kind: 'city' | 'district'
  province?: string
  city?: string
}

function resolveEnvironment(): 'dev' | 'preprod' | 'prod' {
  const value = (process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? 'development')
    .trim()
    .toLowerCase()
  if (value === 'production' || value === 'prod') return 'prod'
  if (value === 'preprod' || value === 'staging') return 'preprod'
  return 'dev'
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function getSessionId() {
  const existing = window.sessionStorage.getItem(SESSION_KEY)
  if (existing) return existing
  const created = createId('location_session')
  window.sessionStorage.setItem(SESSION_KEY, created)
  return created
}

function readRecentEvents(now: number) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DEDUP_KEY) ?? '{}') as Record<string, number>
    return Object.fromEntries(
      Object.entries(parsed).filter(([, timestamp]) =>
        Number.isFinite(timestamp) && now - timestamp >= 0 && now - timestamp < DEDUP_TTL_MS,
      ),
    )
  } catch {
    return {}
  }
}

export function trackLocationNoResult(input: LocationNoResultInput) {
  if (typeof window === 'undefined') return
  const query = input.query.trim().replace(/\s+/g, ' ')
  if (query.length < 2) return

  const signature = [
    input.kind,
    query.toLocaleLowerCase('fr'),
    input.province?.trim().toLocaleLowerCase('fr') ?? '',
    input.city?.trim().toLocaleLowerCase('fr') ?? '',
  ].join('|')
  const now = Date.now()
  const recent = readRecentEvents(now)
  if (recent[signature]) return

  // Réserver avant l'appel évite les doublons issus de plusieurs composants.
  recent[signature] = now
  window.localStorage.setItem(DEDUP_KEY, JSON.stringify(recent))
  const occurredAt = new Date(now).toISOString()
  const searchId = createId('location_search')

  void fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      sent_at: occurredAt,
      occurred_at: occurredAt,
      environment: resolveEnvironment(),
      session: { session_id: getSessionId() },
      search: {
        source: 'property_location_form',
        search_id: searchId,
        query_text_raw: query,
        query_params: {
          locationKind: input.kind,
          ...(input.province ? { province: input.province } : {}),
          ...(input.city ? { city: input.city } : {}),
        },
      },
      result: {
        results_count: 0,
        engine: 'official_catalog_google_places',
      },
    }),
  }).catch((error) => {
    logger.warn('Location no-result analytics request failed', { error })
  })
}
