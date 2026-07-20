'use client'

import {
  claimClientStatisticEvent,
  getOrCreateStatisticsVisitorId,
} from './statistics-visitor.client'

const PROPERTY_VIEW_TTL_MS = 6 * 60 * 60 * 1000
const PROPERTY_INTERACTION_TTL_MS = 10 * 1000

function sendStatistic(url: string, payload: Record<string, unknown>) {
  const body = JSON.stringify(payload)

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
    return
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined)
}

export function trackPropertyViewStatistic(
  propertyId: string,
  metadata: object = {},
) {
  if (!claimClientStatisticEvent(`property:view:${propertyId}`, PROPERTY_VIEW_TTL_MS)) return false

  sendStatistic(`/api/property/${propertyId}/statistics/view`, {
    ...metadata,
    visitorId: getOrCreateStatisticsVisitorId(),
  })
  return true
}

export function trackPropertyInteractionStatistic(
  propertyId: string,
  type: string,
  metadata: Record<string, unknown> = {},
) {
  if (!claimClientStatisticEvent(
    `property:interaction:${propertyId}:${type}`,
    PROPERTY_INTERACTION_TTL_MS,
  )) return false

  sendStatistic(`/api/property/${propertyId}/statistics/interaction`, {
    type,
    visitorId: getOrCreateStatisticsVisitorId(),
    metadata,
  })
  return true
}
