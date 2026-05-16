/**
 * Parser et structureur des données OSM du Gabon
 * Charge et transforme gabon_osm.json en structures utilisables par les combobox
 */

import { findNearestLocation } from '@/lib/geo-haversine';

// Import du fichier OSM local (fallback)
import osmData from './gabon_osm.json';

type OsmRootRecord = Record<string, unknown>;

export interface OSMLocation {
  name: string;
  lat: number;
  lon: number;
  type: 'province' | 'city' | 'quarter';
  osmId: number;
  osmType: 'node' | 'way' | 'relation';
  source: 'places' | 'admin_boundaries';
  originalType?: string; // 'city', 'town', 'suburb', 'village', etc.
}

export interface OSMLocationsData {
  provinces: OSMLocation[];
  cities: OSMLocation[];
  quarters: OSMLocation[];
  // Associations pour lookup rapide
  cityToProvince: Map<string, string>; // city name -> province name
  quarterToCity: Map<string, string>; // quarter name -> city name
  quarterToProvince: Map<string, string>; // quarter name -> province name
}

export interface OSMLocationsSerializable {
  provinces: OSMLocation[];
  cities: OSMLocation[];
  quarters: OSMLocation[];
  cityToProvince: Record<string, string>;
  quarterToCity: Record<string, string>;
  quarterToProvince: Record<string, string>;
}

function toOsmRootRecord(value: unknown): OsmRootRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as OsmRootRecord;
}

/**
 * Normalise un nom (priorité: names.fr > name)
 * Retourne null si aucun nom valide trouvé
 */
function normalizeName(item: any): string | null {
  const name = item.names?.fr || item.name;
  // Filtrer les noms invalides (null, undefined, chaînes vides, "null")
  if (!name || name === 'null' || name.trim() === '') {
    return null;
  }
  return name.trim();
}

/**
 * Extrait les provinces depuis admin_boundaries["4"]
 */
function extractProvinces(root: OsmRootRecord): OSMLocation[] {
  const provinces = (root as any).admin_boundaries?.['4'] || [];

  const mapped = provinces
    .map((item: any): OSMLocation | null => {
      const name = normalizeName(item);
      if (!name) return null; // Ignorer les entrées sans nom valide

      return {
        name,
        lat: item.center?.lat || 0,
        lon: item.center?.lon || 0,
        type: 'province' as const,
        osmId: item.osm?.id || 0,
        osmType: (item.osm?.type || 'relation') as 'node' | 'way' | 'relation',
        source: 'admin_boundaries' as const,
        originalType: 'admin_level_4',
      };
    })
    .filter((loc: OSMLocation | null): loc is OSMLocation => loc !== null && (loc.lat !== 0 || loc.lon !== 0));

  // Dédupliquer par nom (garder le premier)
  const seen = new Map<string, OSMLocation>();
  mapped.forEach((loc: OSMLocation) => {
    if (!seen.has(loc.name)) {
      seen.set(loc.name, loc);
    }
  });

  return Array.from(seen.values());
}

/**
 * Extrait les villes depuis places.city + places.town + admin_boundaries["6"] + admin_boundaries["8"]
 */
function extractCities(root: OsmRootRecord): OSMLocation[] {
  const cities: OSMLocation[] = [];
  const places = (root as any).places || {};
  const adminBoundaries = (root as any).admin_boundaries || {};

  // Places: city
  const placesCities = places.city || [];
  placesCities.forEach((item: any) => {
    const name = normalizeName(item);
    if (!name) return; // Ignorer les entrées sans nom valide

    cities.push({
      name,
      lat: item.center?.lat || 0,
      lon: item.center?.lon || 0,
      type: 'city' as const,
      osmId: item.osm?.id || 0,
      osmType: (item.osm?.type || 'node') as 'node' | 'way' | 'relation',
      source: 'places' as const,
      originalType: 'city',
    });
  });

  // Places: town
  const placesTowns = places.town || [];
  placesTowns.forEach((item: any) => {
    const name = normalizeName(item);
    if (!name) return;

    cities.push({
      name,
      lat: item.center?.lat || 0,
      lon: item.center?.lon || 0,
      type: 'city' as const,
      osmId: item.osm?.id || 0,
      osmType: (item.osm?.type || 'node') as 'node' | 'way' | 'relation',
      source: 'places' as const,
      originalType: 'town',
    });
  });

  // Admin: level 6 (départements)
  const admin6 = adminBoundaries['6'] || [];
  admin6.forEach((item: any) => {
    const name = normalizeName(item);
    if (!name) return;

    cities.push({
      name,
      lat: item.center?.lat || 0,
      lon: item.center?.lon || 0,
      type: 'city' as const,
      osmId: item.osm?.id || 0,
      osmType: (item.osm?.type || 'relation') as 'node' | 'way' | 'relation',
      source: 'admin_boundaries' as const,
      originalType: 'admin_level_6',
    });
  });

  // Admin: level 8 (communes)
  const admin8 = adminBoundaries['8'] || [];
  admin8.forEach((item: any) => {
    const name = normalizeName(item);
    if (!name) return;

    cities.push({
      name,
      lat: item.center?.lat || 0,
      lon: item.center?.lon || 0,
      type: 'city' as const,
      osmId: item.osm?.id || 0,
      osmType: (item.osm?.type || 'relation') as 'node' | 'way' | 'relation',
      source: 'admin_boundaries' as const,
      originalType: 'admin_level_8',
    });
  });

  // Filtrer les coordonnées invalides et dédupliquer par nom (garder la première occurrence)
  const seen = new Map<string, OSMLocation>();
  cities.forEach((loc: OSMLocation) => {
    if (loc.lat === 0 && loc.lon === 0) return;
    // Dédupliquer par nom uniquement (priorité aux premières occurrences)
    if (!seen.has(loc.name)) {
      seen.set(loc.name, loc);
    }
  });

  return Array.from(seen.values());
}

/**
 * Extrait les quartiers depuis tous les types de places + admin_boundaries["9"] + admin_boundaries["10"]
 */
function extractQuarters(root: OsmRootRecord): OSMLocation[] {
  const quarters: OSMLocation[] = [];
  const places = (root as any).places || {};
  const adminBoundaries = (root as any).admin_boundaries || {};
  const placeTypes = ['suburb', 'neighbourhood', 'quarter', 'village', 'hamlet', 'locality'];

  // Places: suburb, neighbourhood, quarter, village, hamlet, locality
  placeTypes.forEach((placeType) => {
    const items = places[placeType] || [];
    items.forEach((item: any) => {
      const name = normalizeName(item);
      if (!name) return; // Ignorer les entrées sans nom valide

      quarters.push({
        name,
        lat: item.center?.lat || 0,
        lon: item.center?.lon || 0,
        type: 'quarter' as const,
        osmId: item.osm?.id || 0,
        osmType: (item.osm?.type || 'node') as 'node' | 'way' | 'relation',
        source: 'places' as const,
        originalType: placeType,
      });
    });
  });

  // Admin: level 9 (arrondissements)
  const admin9 = adminBoundaries['9'] || [];
  admin9.forEach((item: any) => {
    const name = normalizeName(item);
    if (!name) return;

    quarters.push({
      name,
      lat: item.center?.lat || 0,
      lon: item.center?.lon || 0,
      type: 'quarter' as const,
      osmId: item.osm?.id || 0,
      osmType: (item.osm?.type || 'relation') as 'node' | 'way' | 'relation',
      source: 'admin_boundaries' as const,
      originalType: 'admin_level_9',
    });
  });

  // Admin: level 10 (quartiers admin)
  const admin10 = adminBoundaries['10'] || [];
  admin10.forEach((item: any) => {
    const name = normalizeName(item);
    if (!name) return;

    quarters.push({
      name,
      lat: item.center?.lat || 0,
      lon: item.center?.lon || 0,
      type: 'quarter' as const,
      osmId: item.osm?.id || 0,
      osmType: (item.osm?.type || 'relation') as 'node' | 'way' | 'relation',
      source: 'admin_boundaries' as const,
      originalType: 'admin_level_10',
    });
  });

  // Filtrer les coordonnées invalides et dédupliquer par nom+coords (garder la première occurrence)
  const seen = new Map<string, OSMLocation>();
  quarters.forEach((loc: OSMLocation) => {
    if (loc.lat === 0 && loc.lon === 0) return;
    // Utiliser nom+coords comme clé pour éviter les doublons exacts
    const key = `${loc.name}_${loc.lat.toFixed(5)}_${loc.lon.toFixed(5)}`;
    if (!seen.has(key)) {
      seen.set(key, loc);
    }
  });

  return Array.from(seen.values());
}

/**
 * Rattache les villes aux provinces par distance géographique
 */
function associateCitiesToProvinces(
  provinces: OSMLocation[],
  cities: OSMLocation[]
): Map<string, string> {
  const cityToProvince = new Map<string, string>();

  cities.forEach((city) => {
    const nearest = findNearestLocation(city, provinces, 100); // Seuil 100 km
    if (nearest) {
      cityToProvince.set(city.name, nearest.entity.name);
    }
  });

  return cityToProvince;
}

/**
 * Rattache les quartiers aux villes par distance géographique
 */
function associateQuartersToCities(
  cities: OSMLocation[],
  quarters: OSMLocation[]
): Map<string, string> {
  const quarterToCity = new Map<string, string>();

  quarters.forEach((quarter) => {
    // Seuil variable selon le type de quartier
    const isUrban = ['suburb', 'neighbourhood', 'quarter', 'admin_level_9', 'admin_level_10'].includes(
      quarter.originalType || ''
    );
    const maxDistance = isUrban ? 35 : 80; // 35 km urbain, 80 km rural

    const nearest = findNearestLocation(quarter, cities, maxDistance);
    if (nearest) {
      quarterToCity.set(quarter.name, nearest.entity.name);
    }
  });

  return quarterToCity;
}

/**
 * Rattache les quartiers aux provinces (via ville ou directement)
 */
function associateQuartersToProvinces(
  provinces: OSMLocation[],
  quarters: OSMLocation[],
  quarterToCity: Map<string, string>,
  cityToProvince: Map<string, string>
): Map<string, string> {
  const quarterToProvince = new Map<string, string>();

  quarters.forEach((quarter) => {
    // D'abord essayer via la ville
    const cityName = quarterToCity.get(quarter.name);
    if (cityName) {
      const provinceName = cityToProvince.get(cityName);
      if (provinceName) {
        quarterToProvince.set(quarter.name, provinceName);
        return;
      }
    }

    // Sinon, rattachement direct
    const nearest = findNearestLocation(quarter, provinces, 150); // Seuil plus large
    if (nearest) {
      quarterToProvince.set(quarter.name, nearest.entity.name);
    }
  });

  return quarterToProvince;
}

function mapToRecord(map: Map<string, string>) {
  const record: Record<string, string> = {};
  for (const [key, value] of map.entries()) {
    record[key] = value;
  }
  return record;
}

function recordToMap(record: Record<string, string> | null | undefined) {
  const map = new Map<string, string>();
  if (!record) {
    return map;
  }
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      map.set(key, value);
    }
  }
  return map;
}

export function serializeOSMLocationsData(data: OSMLocationsData): OSMLocationsSerializable {
  return {
    provinces: data.provinces,
    cities: data.cities,
    quarters: data.quarters,
    cityToProvince: mapToRecord(data.cityToProvince),
    quarterToCity: mapToRecord(data.quarterToCity),
    quarterToProvince: mapToRecord(data.quarterToProvince),
  };
}

export function deserializeOSMLocationsData(serialized: OSMLocationsSerializable): OSMLocationsData {
  return {
    provinces: Array.isArray(serialized.provinces) ? serialized.provinces : [],
    cities: Array.isArray(serialized.cities) ? serialized.cities : [],
    quarters: Array.isArray(serialized.quarters) ? serialized.quarters : [],
    cityToProvince: recordToMap(serialized.cityToProvince),
    quarterToCity: recordToMap(serialized.quarterToCity),
    quarterToProvince: recordToMap(serialized.quarterToProvince),
  };
}

export function loadOSMLocationsFromRaw(raw: unknown): OSMLocationsData | null {
  const root = toOsmRootRecord(raw);
  if (!root) {
    return null;
  }

  // Extraire les données brutes
  const provinces = extractProvinces(root);
  const cities = extractCities(root);
  const quarters = extractQuarters(root);

  // Créer les associations géographiques
  const cityToProvince = associateCitiesToProvinces(provinces, cities);
  const quarterToCity = associateQuartersToCities(cities, quarters);
  const quarterToProvince = associateQuartersToProvinces(
    provinces,
    quarters,
    quarterToCity,
    cityToProvince
  );

  // Trier par nom alphabétique
  provinces.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  cities.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  quarters.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  return {
    provinces,
    cities,
    quarters,
    cityToProvince,
    quarterToCity,
    quarterToProvince,
  };
}

/**
 * Charge et structure toutes les données OSM
 * Cette fonction est appelée une seule fois au chargement du module
 */
export function loadOSMLocations(): OSMLocationsData {
  const parsed = loadOSMLocationsFromRaw(osmData);
  if (!parsed) {
    throw new Error('Impossible de parser gabon_osm.json');
  }
  return parsed;
}

// Charger les données une seule fois au chargement du module
let cachedData: OSMLocationsData | null = null;

/**
 * Retourne les données OSM (cache en mémoire)
 */
export function getOSMLocations(): OSMLocationsData {
  if (!cachedData) {
    cachedData = loadOSMLocations();
  }
  return cachedData;
}

