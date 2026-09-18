'use client'

import { useCallback } from 'react';
import { trackEvent, trackingEvents } from '@/features/analytics/tracking';
import { trackMetaPixelEvent, metaPixelEvents } from '@/features/analytics/meta-pixel';
import { createLogger } from '@/lib/logger';
import { trackPropertyInteractionStatistic } from '@/lib/statistics/property-statistics.client';
import { trackRecommendationEvent, type RecommendationEventName } from '@/features/recommendation/tracking/recommendation-tracking.client';
import { useRecommendationCardContext } from '@/providers/recommendation-request-provider';

const RECOMMENDATION_EVENT_BY_INTERACTION: Partial<Record<InteractionType, RecommendationEventName>> = {
  favorite_add: 'recommendation_favorite_add',
  favorite_remove: 'recommendation_favorite_remove',
  whatsapp_contact: 'recommendation_contact_whatsapp',
  phone_contact: 'recommendation_contact_phone',
  whatsapp_share: 'recommendation_share',
  facebook_share: 'recommendation_share',
  native_share: 'recommendation_share',
  threads_share: 'recommendation_share',
  instagram_share: 'recommendation_share',
  tiktok_share: 'recommendation_share',
};

const logger = createLogger('hooks.use-track-property-interaction');

export type InteractionType =
  | 'whatsapp_contact'
  | 'phone_contact'
  | 'whatsapp_share'
  | 'facebook_share'
  | 'native_share'
  | 'threads_share'
  | 'instagram_share'
  | 'tiktok_share'
  | 'favorite_add'
  | 'favorite_remove'
  | 'map_click'
  | 'recommendation_click';

export function useTrackPropertyInteraction(propertyId: string | undefined) {
  const recommendationCard = useRecommendationCardContext();

  const trackInteraction = useCallback(
    (type: InteractionType, metadata?: Record<string, any>) => {
      if (!propertyId) {
        logger.warn('Property ID is required to track interaction');
        return;
      }

      trackPropertyInteractionStatistic(propertyId, type, {
        ...metadata,
        timestamp: new Date().toISOString(),
      });

      // Event recommandation corrélé au recommendationRequestId ambiant, en plus (jamais à la
      // place) du tracking GA4/property_statistics ci-dessus — voir docs/recommendation-ml/.
      const recommendationEventName = RECOMMENDATION_EVENT_BY_INTERACTION[type];
      if (recommendationEventName && recommendationCard && recommendationCard.listingId === propertyId) {
        trackRecommendationEvent({
          eventName: recommendationEventName,
          recommendationRequestId: recommendationCard.recommendationRequestId,
          listingId: propertyId,
          position: recommendationCard.position,
          rankingVariant: recommendationCard.rankingVariant,
          rankingVersion: recommendationCard.rankingVersion,
        });
      }

      const analyticsParams = {
        property_id: propertyId,
        interaction_type: type,
      };

      if (type === 'whatsapp_contact') {
        void trackEvent(trackingEvents.CTA_PROPERTY_WHATSAPP_CONTACT_CLICK, analyticsParams);
        void trackMetaPixelEvent(metaPixelEvents.CONTACT, {
          content_ids: [propertyId],
          contact_method: 'whatsapp',
        });
      }

      if (type === 'phone_contact') {
        void trackMetaPixelEvent(metaPixelEvents.CONTACT, {
          content_ids: [propertyId],
          contact_method: 'phone',
        });
      }

      if (type === 'favorite_add') {
        void trackEvent(trackingEvents.CTA_PROPERTY_FAVORITE_ADD_CLICK, analyticsParams);
      }

      if (type === 'favorite_remove') {
        void trackEvent(trackingEvents.CTA_PROPERTY_FAVORITE_REMOVE_CLICK, analyticsParams);
      }
    },
    [propertyId, recommendationCard]
  );

  return { trackInteraction };
}
