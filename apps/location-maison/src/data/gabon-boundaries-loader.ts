/**
 * Loader pour les données GeoJSON des délimitations du Gabon
 * Charge les polygones de manière lazy et les met en cache
 */

import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';

// Types
export interface QuarterFeatureProperties {
  name: string | null;
  nameFr: string | null;
  nameEn: string | null;
  osmType: string;
  osmId: number | string | null;
  adminLevel: string | null;
  placeType: string | null;
  category: string;
  isApproximate: boolean;
  center: { lat: number; lon: number } | null;
}

export type QuarterFeature = Feature<Polygon | MultiPolygon, QuarterFeatureProperties>;
export type QuarterFeatureCollection = FeatureCollection<Polygon | MultiPolygon, QuarterFeatureProperties>;

// Cache en mémoire
let cachedData: QuarterFeatureCollection | null = null;
let loadingPromise: Promise<QuarterFeatureCollection> | null = null;

/**
 * Charge les données GeoJSON des délimitations
 * Utilise un cache en mémoire pour éviter les rechargements
 */
export async function loadGabonBoundaries(): Promise<QuarterFeatureCollection> {
  // Retourner le cache si disponible
  if (cachedData) {
    return cachedData;
  }

  // Si un chargement est en cours, attendre le résultat
  if (loadingPromise) {
    return loadingPromise;
  }

  // Démarrer le chargement
  loadingPromise = fetchBoundaries();
  
  try {
    cachedData = await loadingPromise;
    return cachedData;
  } finally {
    loadingPromise = null;
  }
}

async function fetchBoundaries(): Promise<QuarterFeatureCollection> {
  try {
    const response = await fetch('/data/gabon_polygons.geojson');
    
    if (!response.ok) {
      throw new Error(`Failed to load boundaries: ${response.status}`);
    }

    const data = await response.json();
    return data as QuarterFeatureCollection;
  } catch (error) {
    console.error('Error loading Gabon boundaries:', error);
    // Retourner une collection vide en cas d'erreur
    return {
      type: 'FeatureCollection',
      features: []
    };
  }
}

/**
 * Récupère une feature par son nom
 */
export function getFeatureByName(
  data: QuarterFeatureCollection, 
  name: string
): QuarterFeature | null {
  const normalizedName = name.toLowerCase().trim();
  
  return data.features.find(f => {
    const featureName = f.properties?.name?.toLowerCase().trim();
    const featureNameFr = f.properties?.nameFr?.toLowerCase().trim();
    return featureName === normalizedName || featureNameFr === normalizedName;
  }) || null;
}

/**
 * Récupère toutes les features d'une catégorie
 */
export function getFeaturesByCategory(
  data: QuarterFeatureCollection, 
  category: string
): QuarterFeature[] {
  return data.features.filter(f => f.properties?.category === category);
}

/**
 * Récupère toutes les features avec un nom valide
 */
export function getNamedFeatures(data: QuarterFeatureCollection): QuarterFeature[] {
  return data.features.filter(f => f.properties?.name);
}

/**
 * Vide le cache
 */
export function clearBoundariesCache(): void {
  cachedData = null;
  loadingPromise = null;
}

/**
 * Vérifie si les données sont chargées
 */
export function isBoundariesLoaded(): boolean {
  return cachedData !== null;
}
