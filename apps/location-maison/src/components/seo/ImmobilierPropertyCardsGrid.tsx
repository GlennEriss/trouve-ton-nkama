'use client';

import React from 'react';
import PropertyCard from '@/components/home-page/PropertyCard';
import SponsoredSlot from '@/components/ads/SponsoredSlot';
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
      | { type: 'ad'; key: string; adIndex: number }
    > = [];

    let adIndex = 0;
    properties.forEach((property, index) => {
      items.push({ type: 'property', property });

      const hasEnoughProperties = properties.length > FIRST_AD_AFTER_INDEX;
      if (!hasEnoughProperties) return;

      const isFirstAdPosition = index === FIRST_AD_AFTER_INDEX;
      const isRecurringPosition =
        index > FIRST_AD_AFTER_INDEX &&
        (index - FIRST_AD_AFTER_INDEX) % AD_INTERVAL === 0;

      if (isFirstAdPosition || isRecurringPosition) {
        items.push({ type: 'ad', key: `immobilier-${property.id}-${index}`, adIndex: adIndex++ });
      }
    });

    return items;
  }, [properties]);

  return (
    // flex-wrap plutôt qu'un nombre de colonnes fixe par breakpoint (2026-08-15, demande
    // utilisateur explicite) : la card fait désormais une taille fixe (220px, même gabarit
    // que le carrousel de la home), le nombre de cards par ligne s'adapte à la largeur.
    <div className="mt-6 flex flex-wrap gap-6">
      {feedItems.map((entry, index) =>
        entry.type === 'property' ? (
          <div
            key={entry.property.id}
            className="w-[220px] animate-fade-in-up transform transition-all duration-300 hover:translate-y-[-4px]"
            style={{
              animationDelay: `${Math.min(index, 12) * 45}ms`,
              animationFillMode: 'both',
            }}
          >
            <PropertyCard property={entry.property} />
          </div>
        ) : (
          <SponsoredSlot
            key={`ad-${entry.key}`}
            placement="immobilier_infeed"
            rotationIndex={entry.adIndex}
            className="w-full"
            fallbackSlot={ADSENSE_SLOTS.immobilierInline}
            fallbackSlotKey={entry.key}
            fallbackCompact
          />
        )
      )}
    </div>
  );
}
