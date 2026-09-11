// Équivalent mobile (lecture seule — pas de création Mode sur mobile aujourd'hui) de
// apps/location-maison/src/lib/listing-zones.ts. Voir
// docs/marketplace-multi-categories/08-zones-multiples-mode.md.

const DEFAULT_MAX = 2;

/**
 * Libellé compact des zones d'une annonce : "Libreville" / "Libreville, Franceville" /
 * "Libreville, Franceville +1". Utilise `cities` (zones multiples) si présent et non vide,
 * sinon replie sur `city` seul — comportement inchangé pour l'immobilier (pas de `cities`)
 * et pour une annonce Mode indexée avant ce champ.
 */
export function formatListingZones(
  property: { city?: string; cities?: string[] },
  max = DEFAULT_MAX,
): string {
  const cities = Array.isArray(property.cities) && property.cities.length > 0 ? property.cities : property.city ? [property.city] : [];

  if (cities.length === 0) return '';
  if (cities.length <= max) return cities.join(', ');
  const shown = cities.slice(0, max);
  return `${shown.join(', ')} +${cities.length - shown.length}`;
}
