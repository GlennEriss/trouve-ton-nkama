'use client'

import {
  claimClientStatisticEvent,
  getOrCreateStatisticsVisitorId,
} from './statistics-visitor.client'

type AdEvent = 'impression' | 'click'

const EVENT_TTL_MS: Record<AdEvent, number> = {
  impression: 30 * 60 * 1000,
  click: 5 * 1000,
}

export function trackAdEvent(event: AdEvent, campaignId: string, placementKey: string) {
  try {
    const visitorId = getOrCreateStatisticsVisitorId()
    const eventKey = `ad:${event}:${campaignId}:${placementKey}`
    if (!claimClientStatisticEvent(eventKey, EVENT_TTL_MS[event])) return

    const body = JSON.stringify({ event, campaignId, placementKey, visitorId })
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/advertising/track', new Blob([body], { type: 'application/json' }))
      return
    }
    fetch('/api/advertising/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Tracking best-effort.
  }
}
