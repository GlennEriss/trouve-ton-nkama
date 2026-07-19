'use client'

import {
  claimClientStatisticEvent,
  getOrCreateStatisticsVisitorId,
} from './statistics-visitor.client'

const REEL_VIEW_TTL_MS = 6 * 60 * 60 * 1000
const likeQueues = new Map<string, Promise<void>>()

export type ReelShareTarget =
  | 'native'
  | 'whatsapp'
  | 'facebook'
  | 'x'
  | 'mail'
  | 'tiktok'
  | 'copy'

export function trackReelView(reelId: string) {
  if (!claimClientStatisticEvent(`reel:view:${reelId}`, REEL_VIEW_TTL_MS)) return

  const body = JSON.stringify({ visitorId: getOrCreateStatisticsVisitorId() })
  const url = `/api/reels/${reelId}/statistics/view`
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
  } else {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined)
  }
}

export function trackReelLike(reelId: string, liked: boolean) {
  const previous = likeQueues.get(reelId) ?? Promise.resolve()
  const request = previous.catch(() => undefined).then(async () => {
    const response = await fetch(`/api/reels/${reelId}/statistics/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        liked,
        visitorId: getOrCreateStatisticsVisitorId(),
      }),
    })

    if (!response.ok) {
      throw new Error('Impossible de mettre à jour le like.')
    }
  })

  likeQueues.set(reelId, request)
  const clearQueue = () => {
    if (likeQueues.get(reelId) === request) likeQueues.delete(reelId)
  }
  void request.then(clearQueue, clearQueue)
  return request
}

export function trackReelShare(reelId: string, target: ReelShareTarget) {
  const url = `/api/reels/${reelId}/statistics/share`
  const payload = JSON.stringify({
    target,
    visitorId: getOrCreateStatisticsVisitorId(),
  })

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
  } else {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => undefined)
  }
}
