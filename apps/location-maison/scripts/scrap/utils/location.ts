/**
 * Utilitaires pour la gestion des localisations
 */

import { Location } from '../types/annonce';
import { LocationJSON } from '../mappers';

/**
 * Interface pour les données de localisation enrichies
 */
export interface LocationsData {
  metadata: {
    processed_at: string;
    total_locations: number;
    successful: number;
    failed: number;
    average_confidence: number;
  };
  locations: LocationJSON[];
}

/**
 * Mappe une localisation depuis les données JSON vers le format Firestore
 */
export function mapLocationFromPhoton(locationData: LocationJSON): Location {
  const { photon } = locationData;
  
  return {
    street: photon.street || extractStreetFromOriginal(locationData.original.original),
    city: photon.city || extractCityFromOriginal(locationData.original.original),
    province: photon.province || 'Estuaire', // Par défaut
    additionnalInformation: buildAdditionalInfo(locationData),
    longitude: photon.coordinates[0],
    latitude: photon.coordinates[1],
    country: photon.country || 'Gabon',
    countryCode: 'GA'
  };
}

/**
 * Trouve la localisation correspondante dans les données enrichies
 */
export function findLocationByOriginal(localisations: LocationsData, originalLocation: string): LocationJSON | null {
  const normalizedOriginal = normalizeLocationString(originalLocation);
  
  return localisations.locations.find(loc => 
    normalizeLocationString(loc.original.original) === normalizedOriginal
  ) || null;
}

/**
 * Crée une localisation par défaut si aucune correspondance n'est trouvée
 */
export function createDefaultLocation(originalLocation: string): Location {
  const parts = originalLocation.split(', ');
  const city = parts[0] || 'Libreville';
  const district = parts[1] || '';
  const street = parts[2] || '';
  
  return {
    street: street || district || 'Non précisé',
    city: city,
    province: inferProvinceFromCity(city),
    additionnalInformation: originalLocation,
    longitude: getDefaultCoordinates(city).longitude,
    latitude: getDefaultCoordinates(city).latitude,
    country: 'Gabon',
    countryCode: 'GA'
  };
}

/**
 * Extrait la rue depuis la localisation originale
 */
function extractStreetFromOriginal(original: string): string {
  const parts = original.split(', ');
  return parts[parts.length - 1] || 'Non précisé';
}

/**
 * Extrait la ville depuis la localisation originale
 */
function extractCityFromOriginal(original: string): string {
  const parts = original.split(', ');
  return parts[0] || 'Libreville';
}

/**
 * Construit des informations additionnelles à partir des données
 */
function buildAdditionalInfo(locationData: LocationJSON): string {
  const { original, photon } = locationData;
  const parts = [
    original.parsed.district,
    photon.district,
    ...original.parsed.additional
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : '';
}

/**
 * Normalise une chaîne de localisation pour la comparaison
 */
function normalizeLocationString(location: string): string {
  return location
    .toLowerCase()
    .trim()
    .replace(/[,.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[àáâäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôöø]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c');
}

/**
 * Infère la province à partir de la ville
 */
function inferProvinceFromCity(city: string): string {
  const cityLower = city.toLowerCase();
  
  // Mapping des villes principales vers leurs provinces
  const cityToProvince: Record<string, string> = {
    'libreville': 'Estuaire',
    'owendo': 'Estuaire',
    'akanda': 'Estuaire',
    'ntoum': 'Estuaire',
    'cocobeach': 'Estuaire',
    'port-gentil': 'Ogooué-Maritime',
    'gamba': 'Ogooué-Maritime',
    'omboué': 'Ogooué-Maritime',
    'lambaréné': 'Moyen-Ogooué',
    'ndjolé': 'Moyen-Ogooué',
    'franceville': 'Haut-Ogooué',
    'moanda': 'Haut-Ogooué',
    'mounana': 'Haut-Ogooué',
    'oyem': 'Woleu-Ntem',
    'bitam': 'Woleu-Ntem',
    'mitzic': 'Woleu-Ntem',
    'tchibanga': 'Nyanga',
    'mayumba': 'Nyanga',
    'mouila': 'Ngounié',
    'ndendé': 'Ngounié',
    'koulamoutou': 'Ogooué-Lolo',
    'lastoursville': 'Ogooué-Lolo',
    'makokou': 'Ogooué-Ivindo',
    'booué': 'Ogooué-Ivindo'
  };
  
  return cityToProvince[cityLower] || 'Estuaire';
}

/**
 * Retourne les coordonnées par défaut pour une ville
 */
function getDefaultCoordinates(city: string): { longitude: number; latitude: number } {
  const cityLower = city.toLowerCase();
  
  const defaultCoordinates: Record<string, { longitude: number; latitude: number }> = {
    'libreville': { longitude: 9.4537, latitude: 0.3924 },
    'owendo': { longitude: 9.5000, latitude: 0.3000 },
    'akanda': { longitude: 9.4000, latitude: 0.5000 },
    'port-gentil': { longitude: 8.7815, latitude: -0.7193 },
    'lambaréné': { longitude: 10.2412, latitude: -0.7000 },
    'franceville': { longitude: 13.5833, latitude: -1.6333 },
    'oyem': { longitude: 11.5833, latitude: 1.5833 },
    'tchibanga': { longitude: 11.0167, latitude: -2.8500 },
    'mouila': { longitude: 11.0565, latitude: -1.8658 },
    'koulamoutou': { longitude: 12.4647, latitude: -1.1369 },
    'makokou': { longitude: 12.8607, latitude: 0.5738 }
  };
  
  return defaultCoordinates[cityLower] || { longitude: 9.4537, latitude: 0.3924 }; // Libreville par défaut
}

/**
 * Valide une localisation
 */
export function validateLocation(location: Location): boolean {
  return !!(
    location.city &&
    location.province &&
    location.country &&
    location.countryCode &&
    location.longitude !== undefined &&
    location.latitude !== undefined &&
    location.longitude >= -180 &&
    location.longitude <= 180 &&
    location.latitude >= -90 &&
    location.latitude <= 90
  );
}

/**
 * Charge les données de localisation depuis un fichier JSON
 */
export async function loadLocationsData(filePath: string): Promise<LocationsData> {
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as LocationsData;
  } catch (error) {
    console.error('Erreur lors du chargement des données de localisation:', error);
    throw error;
  }
}

/**
 * Statistiques sur les localisations
 */
export function getLocationStats(localisations: LocationsData): {
  total: number;
  successful: number;
  failed: number;
  averageConfidence: number;
  byProvince: Record<string, number>;
} {
  const byProvince: Record<string, number> = {};
  
  localisations.locations.forEach(loc => {
    const province = loc.photon.province || 'Inconnue';
    byProvince[province] = (byProvince[province] || 0) + 1;
  });
  
  return {
    total: localisations.metadata.total_locations,
    successful: localisations.metadata.successful,
    failed: localisations.metadata.failed,
    averageConfidence: localisations.metadata.average_confidence,
    byProvince
  };
} 