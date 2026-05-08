'use client';

import React from 'react';
import PropertyCard from '@/components/home-page/PropertyCard';
import type { LandingPropertyCard } from '@/lib/seo/algolia-listings';

type ImmobilierPropertyCardsGridProps = {
  properties: LandingPropertyCard[];
};

export default function ImmobilierPropertyCardsGrid({ properties }: ImmobilierPropertyCardsGridProps) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
      {properties.map((property, index) => (
        <div
          key={property.id}
          className="h-full animate-fade-in-up transform transition-all duration-300 hover:translate-y-[-4px]"
          style={{
            animationDelay: `${Math.min(index, 12) * 45}ms`,
            animationFillMode: 'both',
          }}
        >
          <PropertyCard property={property} />
        </div>
      ))}
    </div>
  );
}
