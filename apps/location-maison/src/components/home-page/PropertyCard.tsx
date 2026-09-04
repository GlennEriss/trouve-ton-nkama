"use client";

import React from "react";
import ListingCard from "@/components/listing/ListingCard";

/**
 * Alias historique de ListingCard — conservé pour ne pas devoir toucher tous les appelants
 * existants (PropertyCarousel, pages search, SEO immobilier, etc.). Densité "compact"
 * depuis le 2026-08-15 (demande utilisateur explicite) : même gabarit de carte, même taille,
 * dans toute la plateforme — immobilier et Mode ne doivent plus avoir deux designs de card
 * différents. Voir docs/marketplace-multi-categories/07-lots-et-sequencement.md, Lot 3/9.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PropertyCard = ({
  property,
  hideDate = false,
  priority = false,
}: {
  property: any;
  hideDate?: boolean;
  priority?: boolean;
}) => {
  return <ListingCard property={property} hideDate={hideDate} density="compact" priority={priority} />;
};

export default PropertyCard;
