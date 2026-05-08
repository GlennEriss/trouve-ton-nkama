'use client';

import React from 'react';
import PropertyCard from '@/components/home-page/PropertyCard';
import InlineAdUnit from '@/components/ads/InlineAdUnit';
import { ADSENSE_SLOTS } from '@/lib/ads/config';
import type { LandingPropertyCard } from '@/lib/seo/algolia-listings';

type ImmobilierPropertyCardsGridProps = {
  properties: LandingPropertyCard[];
};

export default function ImmobilierPropertyCardsGrid({ properties }: ImmobilierPropertyCardsGridProps) {
  const feedItems = React.useMemo(() => {
    const FIRST_AD_AFTER_INDEX = 7;
    const AD_INTERVAL = 14;

    const items: Array<
      | { type: 'property'; property: LandingPropertyCard }
      | { type: 'ad'; key: string }
    > = [];

    properties.forEach((property, index) => {
      items.push({ type: 'property', property });

      const hasEnoughProperties = properties.length > FIRST_AD_AFTER_INDEX;
      if (!hasEnoughProperties) return;

      const isFirstAdPosition = index === FIRST_AD_AFTER_INDEX;
      const isRecurringPosition =
        index > FIRST_AD_AFTER_INDEX &&
        (index - FIRST_AD_AFTER_INDEX) % AD_INTERVAL === 0;

      if (isFirstAdPosition || isRecurringPosition) {
        items.push({ type: 'ad', key: `immobilier-${property.id}-${index}` });
      }
    });

    return items;
  }, [properties]);

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
      {feedItems.map((entry, index) =>
        entry.type === 'property' ? (
          <div
            key={entry.property.id}
            className="h-full animate-fade-in-up transform transition-all duration-300 hover:translate-y-[-4px]"
            style={{
              animationDelay: `${Math.min(index, 12) * 45}ms`,
              animationFillMode: 'both',
            }}
          >
            <PropertyCard property={entry.property} />
          </div>
        ) : (
          <InlineAdUnit
            key={`ad-${entry.key}`}
            className="sm:col-span-2 lg:col-span-3 xl:col-span-4"
            slot={ADSENSE_SLOTS.immobilierInline}
            slotKey={entry.key}
            compact
          />
        )
      )}
    </div>
  );
}
