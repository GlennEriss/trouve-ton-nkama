// Zones multiples (Mode, etc.) — voir docs/marketplace-multi-categories/
// 08-zones-multiples-mode.md. Équivalent admin de
// apps/location-maison/src/lib/listing-zones.ts (dépôt distinct dans le même monorepo, pas
// de package partagé pour cette logique) — un vendeur créé/importé depuis le back-office
// peut vendre dans plusieurs villes, tout comme celui qui passe par le générateur IA côté
// web.

export const MAX_LISTING_ZONES = 5;

export type LocationZone = {
  city: string;
  province: string;
  latitude: number;
  longitude: number;
};

/** Dédoublonne (insensible à la casse/espaces) et plafonne, en préservant l'ordre. */
export function normalizeCityNames(cities: readonly string[], max = MAX_LISTING_ZONES): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of cities) {
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase("fr-FR");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= max) break;
  }
  return result;
}

/**
 * Construit `zones` + les champs de rétrocompatibilité (`city`/`province`/`latitude`/
 * `longitude` = zone primaire) + la dénormalisation Algolia (`cities`/`provinces`) — même
 * province pour toutes les zones (pas de catalogue ville->province branché ici, voir
 * 08-zones-multiples-mode.md §3.3/§9).
 */
export function buildZonesPatch(zones: readonly LocationZone[]): {
  zones: LocationZone[];
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  cities: string[];
  provinces: string[];
} {
  const primary = zones[0];
  return {
    zones: [...zones],
    city: primary?.city ?? "",
    province: primary?.province ?? "",
    latitude: primary?.latitude ?? 0,
    longitude: primary?.longitude ?? 0,
    cities: normalizeCityNames(zones.map((zone) => zone.city)),
    provinces: Array.from(new Set(zones.map((zone) => zone.province).filter(Boolean))),
  };
}
