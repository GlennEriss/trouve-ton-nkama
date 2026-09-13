/**
 * Générateur d'identifiant déterministe pour les collections géographiques secondaires
 * (`provinces`, `cities`, `streets`) — copie fidèle de `LocationIdGenerator`
 * (apps/location-maison/src/db/generic.db.ts), utilisée aujourd'hui côté client. Le format
 * ne doit PAS changer dans ce lot (voir docs/performance-creation-modification-annonces-reels.md,
 * point 1, décision 5) : les API `/api/location/*` utilisent ces identifiants comme clés de
 * relation (provinceId, cityId).
 */
export function generateLocationId(name: string, longitude?: number, latitude?: number): string {
  const normalizedName = name.toLowerCase().replace(/\s+/g, '');
  if (typeof longitude === 'number' && typeof latitude === 'number' && Number.isFinite(longitude) && Number.isFinite(latitude)) {
    return `${normalizedName}_${longitude.toFixed(5)}_${latitude.toFixed(5)}`;
  }
  // Fallback historique du client quand les coordonnées manquent (voir province.db.ts /
  // city.db.ts / street.db.ts) : mêmes valeurs figées "0.00000".
  return `${normalizedName}_0.00000_0.00000`;
}
