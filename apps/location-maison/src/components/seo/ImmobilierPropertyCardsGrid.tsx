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

  // Groupe les cards consécutives entre deux pubs (2026-08-15, demande utilisateur
  // explicite) : une pub insérée comme simple item d'une grille auto-fit partagée force un
  // saut de ligne à un index fixe qui ne correspond pas forcément à un nombre plein de
  // colonnes (variable selon la largeur d'écran) — la ligne juste avant la pub restait donc
  // partiellement vide. Chaque groupe de cards a désormais sa PROPRE grille, qui se remplit
  // toujours entièrement puisqu'aucun autre élément ne vient forcer un saut de ligne dedans.
  const feedGroups = React.useMemo(() => {
    const groups: Array<
      | { kind: 'properties'; entries: Extract<(typeof feedItems)[number], { type: 'property' }>[] }
      | { kind: 'ad'; entry: Extract<(typeof feedItems)[number], { type: 'ad' }> }
    > = [];
    let current: Extract<(typeof feedItems)[number], { type: 'property' }>[] = [];
    for (const entry of feedItems) {
      if (entry.type === 'property') {
        current.push(entry);
      } else {
        if (current.length > 0) {
          groups.push({ kind: 'properties', entries: current });
          current = [];
        }
        groups.push({ kind: 'ad', entry });
      }
    }
    if (current.length > 0) {
      groups.push({ kind: 'properties', entries: current });
    }
    return groups;
  }, [feedItems]);

  return (
    <div className="mt-6 space-y-6">
      {feedGroups.map((group, groupIndex) =>
        group.kind === 'properties' ? (
          <div
            key={`properties-${groupIndex}`}
            className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6"
          >
            {group.entries.map((entry, index) => (
              <div
                key={entry.property.id}
                className="animate-fade-in-up transform transition-all duration-300 hover:translate-y-[-4px]"
                style={{
                  animationDelay: `${Math.min(index, 12) * 45}ms`,
                  animationFillMode: 'both',
                }}
              >
                <PropertyCard property={entry.property} />
              </div>
            ))}
          </div>
        ) : (
          <SponsoredSlot
            key={`ad-${group.entry.key}`}
            placement="immobilier_infeed"
            rotationIndex={group.entry.adIndex}
            fallbackSlot={ADSENSE_SLOTS.immobilierInline}
            fallbackSlotKey={group.entry.key}
            fallbackCompact
          />
        )
      )}
    </div>
  );
}
