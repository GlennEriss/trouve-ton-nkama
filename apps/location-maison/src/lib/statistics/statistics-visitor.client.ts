'use client'

const VISITOR_ID_KEY = 'ttn-statistics-visitor-id'
const RECENT_EVENTS_KEY = 'ttn-statistics-recent-events'
const MAX_RECENT_EVENTS = 200
const VALID_VISITOR_ID = /^[a-zA-Z0-9_-]{12,128}$/

let memoryVisitorId: string | null = null
const memoryEvents = new Map<string, number>()

function createVisitorId() {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
  return `ttn_${randomPart.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

export function getOrCreateStatisticsVisitorId(): string {
  if (typeof window === 'undefined') {
    memoryVisitorId ??= createVisitorId()
    return memoryVisitorId
  }

  try {
    const existing = window.localStorage.getItem(VISITOR_ID_KEY)
    if (existing && VALID_VISITOR_ID.test(existing)) return existing

    const visitorId = createVisitorId()
    window.localStorage.setItem(VISITOR_ID_KEY, visitorId)
    return visitorId
  } catch {
    memoryVisitorId ??= createVisitorId()
    return memoryVisitorId
  }
}

export function claimClientStatisticEvent(
  eventKey: string,
  ttlMs: number,
  now = Date.now(),
): boolean {
  if (!eventKey || ttlMs <= 0) return false

  if (typeof window === 'undefined') {
    const expiresAt = memoryEvents.get(eventKey)
    if (typeof expiresAt === 'number' && expiresAt > now) return false
    memoryEvents.set(eventKey, now + ttlMs)
    return true
  }

  try {
    const raw = window.localStorage.getItem(RECENT_EVENTS_KEY)
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {}
    const recent = Object.fromEntries(
      Object.entries(parsed)
        .filter(([, expiresAt]) => typeof expiresAt === 'number' && expiresAt > now)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, MAX_RECENT_EVENTS),
    ) as Record<string, number>

    const expiresAt = recent[eventKey]
    if (typeof expiresAt === 'number' && expiresAt > now) return false

    recent[eventKey] = now + ttlMs
    window.localStorage.setItem(RECENT_EVENTS_KEY, JSON.stringify(recent))
    return true
  } catch {
    const expiresAt = memoryEvents.get(eventKey)
    if (typeof expiresAt === 'number' && expiresAt > now) return false
    memoryEvents.set(eventKey, now + ttlMs)
    return true
  }
}
