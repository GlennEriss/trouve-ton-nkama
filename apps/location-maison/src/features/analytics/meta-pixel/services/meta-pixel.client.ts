'use client';

import { createLogger } from '@/lib/logger';
import { isMetaPixelEnabled } from '../domain/config';
import type { MetaPixelCustomData, MetaPixelEventName } from '../domain/events';

const logger = createLogger('analytics.meta-pixel-client');

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function sha256Hex(value: string): Promise<string | undefined> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return undefined;
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function createEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type TrackOptions = {
  /** Email de l'utilisateur connecté, si dispo — améliore le matching CAPI (hashé avant envoi). */
  email?: string;
};

/**
 * PageView sur navigation App Router (pas de rechargement, donc le script de base ne le voit
 * pas tout seul après la 1ère page) — Pixel seul, pas de forward Conversions API : volumétrie
 * élevée pour un signal d'audience/retargeting, pas un événement de conversion à fiabiliser.
 */
export function trackMetaPixelPageView(): void {
  if (!isMetaPixelEnabled()) return;
  try {
    window.fbq?.('track', 'PageView');
  } catch (error) {
    logger.warn('fbq PageView failed', { error });
  }
}

/**
 * Déclenche un événement Meta Pixel + Conversions API en parallèle, avec le même event_id
 * pour permettre à Meta de dédupliquer les deux envois (recommandé par Meta quand le Pixel
 * client ET la CAPI serveur envoient le même événement — sinon il est compté deux fois).
 * No-op silencieux si NEXT_PUBLIC_META_PIXEL_ID n'est pas configuré.
 */
export async function trackMetaPixelEvent(
  eventName: MetaPixelEventName,
  customData: MetaPixelCustomData = {},
  options: TrackOptions = {}
): Promise<void> {
  if (!isMetaPixelEnabled()) return;

  const eventId = createEventId();

  try {
    window.fbq?.('track', eventName, customData, { eventID: eventId });
  } catch (error) {
    logger.warn('fbq track failed', { eventName, error });
  }

  try {
    const hashedEmail = options.email ? await sha256Hex(options.email) : undefined;

    const payload = JSON.stringify({
      event_name: eventName,
      event_id: eventId,
      event_source_url: typeof window !== 'undefined' ? window.location.href : undefined,
      custom_data: customData,
      fbp: readCookie('_fbp'),
      fbc: readCookie('_fbc'),
      hashed_email: hashedEmail,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/meta/capi', new Blob([payload], { type: 'application/json' }));
    } else {
      await fetch('/api/meta/capi', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
        keepalive: true,
      });
    }
  } catch (error) {
    logger.warn('Conversions API forward failed', { eventName, error });
  }
}
