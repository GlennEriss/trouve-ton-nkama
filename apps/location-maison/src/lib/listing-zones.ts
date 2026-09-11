import type { LocationZone, Property } from '@/models/annonce';

/**
 * Logique d'affichage/normalisation des zones multiples (Mode, etc.) — un seul endroit
 * plutôt que dupliqué (c'était déjà le cas deux fois avant ce fichier : ListingCard.tsx et
 * AdManagementPage.tsx avaient chacun leur propre `locationLabel`/`formatLocation`
 * identiques). Voir docs/marketplace-multi-categories/08-zones-multiples-mode.md.
 */

// Au-delà de ce nombre, l'IA/l'éditeur manuel tronquent silencieusement — une annonce avec
// "partout au Gabon" décrit une portée nationale, pas une liste de zones de vente.
export const MAX_LISTING_ZONES = 5;

/**
 * Zones d'une annonce, avec repli sur les champs `city`/`province`/`latitude`/`longitude`
 * singuliers hérités de `Location` quand `zones` est absent (annonce Mode créée avant ce
 * champ — AUCUN backfill n'est nécessaire pour que ceci fonctionne). Toujours 0 ou 1+
 * élément(s), jamais `undefined`.
 */
export function getListingZones(
  property: Pick<Property, 'zones' | 'city' | 'province' | 'latitude' | 'longitude'>,
): LocationZone[] {
  if (Array.isArray(property.zones) && property.zones.length > 0) {
    return property.zones;
  }
  if (property.city && property.city.trim().length > 0) {
    return [
      {
        city: property.city,
        province: property.province ?? '',
        latitude: property.latitude ?? 0,
        longitude: property.longitude ?? 0,
      },
    ];
  }
  return [];
}

/**
 * Dédoublonne (insensible à la casse/espaces) et plafonne une liste de villes saisies par
 * l'IA ou un éditeur manuel — préserve l'ordre de première apparition.
 */
export function normalizeCityNames(cities: readonly string[], max = MAX_LISTING_ZONES): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of cities) {
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase('fr-FR');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= max) break;
  }
  return result;
}

/**
 * Libellé compact pour les surfaces à espace contraint (cartes de grille, chips) :
 * "Libreville" / "Libreville, Franceville" / "Libreville, Franceville +2". `max` = nombre de
 * villes nommées avant troncature en "+N".
 */
export function formatZonesLabel(zones: readonly LocationZone[], opts?: { max?: number }): string {
  const max = opts?.max ?? 2;
  const cities = zones.map((zone) => zone.city).filter(Boolean);
  if (cities.length === 0) return '';
  if (cities.length <= max) return cities.join(', ');
  const shown = cities.slice(0, max);
  const remaining = cities.length - shown.length;
  return `${shown.join(', ')} +${remaining}`;
}

/** Dénormalisation pour Algolia (voir extensions/firestore-algolia-search.env, FIELDS=). */
export function denormalizeZonesForSearch(zones: readonly LocationZone[]): {
  cities: string[];
  provinces: string[];
} {
  return {
    cities: normalizeCityNames(zones.map((zone) => zone.city)),
    provinces: Array.from(new Set(zones.map((zone) => zone.province).filter(Boolean))),
  };
}

/**
 * Construit `zones` + les champs de rétrocompatibilité (`city`/`province`/`latitude`/
 * `longitude` = zone primaire) + la dénormalisation Algolia (`cities`/`provinces`), à partir
 * d'une liste de zones déjà résolues (ville + province + coordonnées). Utilisé par tous les
 * chemins d'écriture (création IA, édition manuelle, formulaire admin).
 */
export function buildZonesPatch(zones: readonly LocationZone[]): Pick<
  Property,
  'zones' | 'city' | 'province' | 'latitude' | 'longitude' | 'cities' | 'provinces'
> {
  const primary = zones[0];
  const { cities, provinces } = denormalizeZonesForSearch(zones);
  return {
    zones: [...zones],
    city: primary?.city ?? '',
    province: primary?.province ?? '',
    latitude: primary?.latitude ?? 0,
    longitude: primary?.longitude ?? 0,
    cities,
    provinces,
  };
}
