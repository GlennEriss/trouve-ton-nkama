'use client'

import { createLogger } from '@/lib/logger'
import { getOrCreateStatisticsVisitorId } from '@/lib/statistics/statistics-visitor.client'

const logger = createLogger('recommendation.tracking-client')
const EVENTS_ENDPOINT = '/api/recommendations/events'
const FLUSH_INTERVAL_MS = 3000
const MAX_BATCH_SIZE = 50

export type RecommendationEventName =
  | 'recommendation_impression'
  | 'recommendation_click'
  | 'recommendation_detail_view'
  | 'recommendation_favorite_add'
  | 'recommendation_favorite_remove'
  | 'recommendation_contact_whatsapp'
  | 'recommendation_contact_phone'
  | 'recommendation_share'
  | 'recommendation_hide'

export type RecommendationEventInput = {
  eventName: RecommendationEventName
  recommendationRequestId: string
  listingId: string
  position?: number
  rankingVariant: string
  rankingVersion: string
}

let queue: Array<RecommendationEventInput & { eventId: string; occurredAt: string }> = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function createEventId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `reco_evt_${crypto.randomUUID()}`
  }
  return `reco_evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

function sendBatch(events: Array<RecommendationEventInput & { eventId: string; occurredAt: string }>) {
  if (events.length === 0) return

  const body = JSON.stringify({ events, visitorId: getOrCreateStatisticsVisitorId() })

  // sendBeacon garantit l'envoi même pendant un pagehide/beforeunload ; fetch keepalive en repli
  // pour les navigateurs/anciens contextes sans sendBeacon.
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'application/json' })
    const sent = navigator.sendBeacon(EVENTS_ENDPOINT, blob)
    if (sent) return
  }

  void fetch(EVENTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch((error) => {
    logger.warn('Recommendation events flush failed', { error })
  })
}

function scheduleFlush() {
  if (flushTimer !== null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushQueue()
  }, FLUSH_INTERVAL_MS)
}

export function flushQueue() {
  if (queue.length === 0) return
  const batch = queue.splice(0, MAX_BATCH_SIZE)
  sendBatch(batch)
}

export function trackRecommendationEvent(input: RecommendationEventInput) {
  queue.push({ ...input, eventId: createEventId(), occurredAt: new Date().toISOString() })

  if (queue.length >= MAX_BATCH_SIZE) {
    flushQueue()
    return
  }

  scheduleFlush()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushQueue)
  window.addEventListener('beforeunload', flushQueue)
}

// Exposé pour les tests uniquement : remet la file à zéro entre deux scénarios.
export function __resetRecommendationTrackingQueueForTests() {
  queue = []
  if (flushTimer !== null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
}
