'use client'

import { useCallback } from 'react';
import { trackEvent, trackingEvents } from '@/features/analytics/tracking';

export type InteractionType = 
  | 'whatsapp_contact'
  | 'phone_contact'
  | 'whatsapp_share'
  | 'facebook_share'
  | 'native_share'
  | 'favorite_add'
  | 'favorite_remove'
  | 'map_click'
  | 'recommendation_click';

/**
 * Hook pour tracker les interactions sur une propriété
 * (clics sur contacts, partages, favoris, etc.)
 */
export function useTrackPropertyInteraction(propertyId: string | undefined) {
  const trackInteraction = useCallback((
    type: InteractionType,
    metadata?: Record<string, any>
  ) => {
    if (!propertyId) {
      console.warn('Property ID is required to track interaction');
      return;
    }

    // Envoyer au serveur de manière asynchrone (non bloquant)
    const data = JSON.stringify({
      type,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });

    // Utiliser sendBeacon pour les interactions critiques (contact, partage)
    const isCritical = type === 'whatsapp_contact' || type === 'phone_contact' || type === 'whatsapp_share' || type === 'facebook_share';

    if (isCritical && navigator.sendBeacon) {
      const blob = new Blob([data], { type: 'application/json' });
      navigator.sendBeacon(
        `/api/property/${propertyId}/statistics/interaction`,
        blob
      );
    } else {
      // Pour les autres interactions, utiliser fetch avec keepalive
      fetch(`/api/property/${propertyId}/statistics/interaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data,
        keepalive: true,
      }).catch((error) => {
        console.error('Error tracking interaction:', error);
      });
    }

    const analyticsParams = {
      property_id: propertyId,
      interaction_type: type,
    };

    if (type === 'whatsapp_contact') {
      void trackEvent(trackingEvents.CTA_PROPERTY_WHATSAPP_CONTACT_CLICK, analyticsParams);
    }

    if (type === 'favorite_add') {
      void trackEvent(trackingEvents.CTA_PROPERTY_FAVORITE_ADD_CLICK, analyticsParams);
    }

    if (type === 'favorite_remove') {
      void trackEvent(trackingEvents.CTA_PROPERTY_FAVORITE_REMOVE_CLICK, analyticsParams);
    }
  }, [propertyId]);

  return { trackInteraction };
}
