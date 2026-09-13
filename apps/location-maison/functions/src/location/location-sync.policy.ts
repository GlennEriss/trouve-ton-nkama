/**
 * Logique pure de synchronisation géographique — voir
 * docs/performance-creation-modification-annonces-reels.md, point 1 (« Sortir les entités
 * géographiques du chemin critique »). Aucune I/O ici : ce fichier ne fait qu'extraire et
 * comparer les champs de localisation d'un document `properties`, pour décider SI un
 * traitement Firestore secondaire doit se déclencher — le service qui fait l'écriture
 * effective vit dans location-sync.service.ts.
 */

export type NormalizedLocation = {
  province: string;
  city: string;
  /** Chaîne vide si l'annonce n'a pas de rue (aucune rue à créer, voir shouldCreateStreet). */
  street: string;
  country: string;
  countryCode: string;
  provinceLon?: number;
  provinceLat?: number;
  cityLon?: number;
  cityLat?: number;
  streetLon?: number;
  streetLat?: number;
};

const COMPARISON_FIELDS = [
  'province',
  'city',
  'street',
  'country',
  'countryCode',
  'provinceLon',
  'provinceLat',
  'cityLon',
  'cityLat',
  'streetLon',
  'streetLat',
] as const satisfies readonly (keyof NormalizedLocation)[];

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Extrait la localisation scalaire utile d'un document `properties`, ou `null` si le
 * document ne relève pas de la hiérarchie historique province/ville/rue :
 * - pas de `province` ou pas de `city` (rien à synchroniser) ;
 * - annonce à zones multiples (`zones`/`cities`, catégories Mode — voir
 *   docs/marketplace-multi-categories/08-zones-multiples-mode.md) : explicitement HORS
 *   PÉRIMÈTRE de ce trigger, décision du point 1 — une interprétation implicite créerait des
 *   villes avec une province placeholder.
 *
 * `country`/`countryCode` retombent sur les valeurs historiques ("Gabon"/"GA") UNIQUEMENT
 * quand le document ne les contient pas — jamais un écrasement d'une valeur déjà présente.
 */
export function extractLocationFields(data: Record<string, unknown> | undefined | null): NormalizedLocation | null {
  if (!data) return null;
  if (Array.isArray(data.zones) || Array.isArray(data.cities)) return null;

  const province = toTrimmedString(data.province);
  const city = toTrimmedString(data.city);
  if (!province || !city) return null;

  const country = toTrimmedString(data.country) || 'Gabon';
  const countryCode = toTrimmedString(data.countryCode) || 'GA';

  return {
    province,
    city,
    street: toTrimmedString(data.street),
    country,
    countryCode,
    provinceLon: toFiniteNumber(data.provinceLon),
    provinceLat: toFiniteNumber(data.provinceLat),
    cityLon: toFiniteNumber(data.cityLon),
    cityLat: toFiniteNumber(data.cityLat),
    streetLon: toFiniteNumber(data.streetLon),
    streetLat: toFiniteNumber(data.streetLat),
  };
}

/** `true` seulement si l'annonce a une rue non vide (pas de document `streets` sinon). */
export function shouldCreateStreet(location: NormalizedLocation): boolean {
  return location.street.length > 0;
}

function locationsEqual(a: NormalizedLocation, b: NormalizedLocation): boolean {
  return COMPARISON_FIELDS.every((field) => a[field] === b[field]);
}

/**
 * Décide si l'événement Firestore `properties/{propertyId}` doit déclencher une
 * synchronisation géographique :
 * - une suppression est toujours ignorée ;
 * - une création avec localisation exploitable déclenche toujours la synchronisation ;
 * - une modification qui ne touche à aucun des champs de localisation (prix, description,
 *   modération, sortTimestamp...) est ignorée — pas de lecture ni d'écriture géographique ;
 * - une modification qui rend la localisation exploitable (ex. complétée après coup) ou qui
 *   change province/ville/rue déclenche la synchronisation.
 */
export function shouldSyncLocation(
  before: Record<string, unknown> | undefined | null,
  after: Record<string, unknown> | undefined | null,
): boolean {
  const afterLocation = extractLocationFields(after);
  if (!afterLocation) return false; // suppression, ou document sans localisation exploitable

  const beforeLocation = extractLocationFields(before);
  if (!beforeLocation) return true; // création, ou localisation devenue exploitable

  return !locationsEqual(beforeLocation, afterLocation);
}
