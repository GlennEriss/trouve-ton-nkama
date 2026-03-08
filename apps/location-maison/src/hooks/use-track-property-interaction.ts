'use client'

import { useCallback } from 'react';
import { trackEvent, trackingEvents } from '@/features/analytics/tracking';
import { createLogger } from '@/lib/logger';

const logger = createLogger('hooks.use-track-property-interaction');

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

export function useTrackPropertyInteraction(propertyId: string | undefined) {
  const trackInteraction = useCallback(
    (type: InteractionType, metadata?: Record<string, any>) => {
      if (!propertyId) {
        logger.warn('Property ID is required to track interaction');
        return;
      }

      const data = JSON.stringify({
        type,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      });

      const isCritical =
        type === 'whatsapp_contact' ||
        type === 'phone_contact' ||
        type === 'whatsapp_share' ||
        type === 'facebook_share';

      if (isCritical && navigator.sendBeacon) {
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(`/api/property/${propertyId}/statistics/interaction`, blob);
      } else {
        fetch(`/api/property/${propertyId}/statistics/interaction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: data,
          keepalive: true,
        }).catch((error) => {
          logger.error('Failed to track property interaction', {
            propertyId,
            type,
            error,
          });
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
    },
    [propertyId]
  );

  return { trackInteraction };
}
