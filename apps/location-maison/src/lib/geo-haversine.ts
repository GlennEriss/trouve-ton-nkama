/**
 * Utilitaires géographiques pour calculer les distances et trouver les entités les plus proches
 * Utilise la formule de Haversine pour calculer les distances sur une sphère
 */

export interface Coordinates {
  lat: number;
  lon: number;
}

/**
 * Calcule la distance en kilomètres entre deux points géographiques
 * en utilisant la formule de Haversine
 * 
 * @param point1 Premier point (lat, lon)
 * @param point2 Deuxième point (lat, lon)
 * @returns Distance en kilomètres
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRadians(point2.lat - point1.lat);
  const dLon = toRadians(point2.lon - point1.lon);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) *
      Math.cos(toRadians(point2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convertit des degrés en radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Trouve l'entité la plus proche d'un point donné
 * 
 * @param point Point de référence
 * @param candidates Liste des candidats avec leurs coordonnées
 * @param maxDistance Distance maximale acceptée (en km). Si null, pas de limite
 * @returns L'entité la plus proche et sa distance, ou null si aucun candidat dans le seuil
 */
export function findNearestLocation<T extends Coordinates>(
  point: Coordinates,
  candidates: T[],
  maxDistance: number | null = null
): { entity: T; distance: number } | null {
  if (candidates.length === 0) return null;

  let nearest: { entity: T; distance: number } | null = null;

  for (const candidate of candidates) {
    if (!candidate.lat || !candidate.lon) continue; // Ignorer les coordonnées invalides

    const distance = calculateDistance(point, candidate);

    // Si on dépasse la distance maximale, ignorer
    if (maxDistance !== null && distance > maxDistance) continue;

    // Garder le plus proche
    if (!nearest || distance < nearest.distance) {
      nearest = { entity: candidate, distance };
    }
  }

  return nearest;
}

/**
 * Trouve toutes les entités dans un rayon donné
 * 
 * @param point Point de référence
 * @param candidates Liste des candidats
 * @param radius Rayon en kilomètres
 * @returns Liste des entités dans le rayon, triées par distance croissante
 */
export function findLocationsInRadius<T extends Coordinates>(
  point: Coordinates,
  candidates: T[],
  radius: number
): Array<{ entity: T; distance: number }> {
  const results: Array<{ entity: T; distance: number }> = [];

  for (const candidate of candidates) {
    if (!candidate.lat || !candidate.lon) continue;

    const distance = calculateDistance(point, candidate);

    if (distance <= radius) {
      results.push({ entity: candidate, distance });
    }
  }

  // Trier par distance croissante
  results.sort((a, b) => a.distance - b.distance);

  return results;
}

