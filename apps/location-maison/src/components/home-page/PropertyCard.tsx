"use client";

import React from "react";
import ListingCard from "@/components/listing/ListingCard";

/**
 * Alias historique de ListingCard (density="standard") — conservé tel quel pour ne pas
 * devoir toucher tous les appelants existants (PropertyCarousel, pages search, SEO
 * immobilier, etc. — voir docs/marketplace-multi-categories/07-lots-et-sequencement.md,
 * Lot 3). Les nouvelles grilles (Mode, densités compact/showcase) doivent importer
 * ListingCard directement plutôt que d'étendre ce wrapper.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PropertyCard = ({ property, hideDate = false }: { property: any; hideDate?: boolean }) => {
  return <ListingCard property={property} hideDate={hideDate} density="standard" />;
};

export default PropertyCard;
