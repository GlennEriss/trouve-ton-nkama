/**
 * Hook pour charger et accéder aux polygones de délimitation des quartiers
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  loadGabonBoundaries, 
  getFeatureByName, 
  getNamedFeatures,
  type QuarterFeatureCollection,
  type QuarterFeature 
} from '@/data/gabon-boundaries-loader';

interface UseQuarterPolygonsReturn {
  // État
  data: QuarterFeatureCollection | null;
  isLoading: boolean;
  error: Error | null;
  
  // Helpers
  getPolygonByName: (name: string) => QuarterFeature | null;
  getAllPolygons: () => QuarterFeature[];
  getPolygonsByCategory: (category: string) => QuarterFeature[];
  
  // Actions
  reload: () => Promise<void>;
}

export function useQuarterPolygons(): UseQuarterPolygonsReturn {
  const [data, setData] = useState<QuarterFeatureCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Charger les données au montage
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const boundaries = await loadGabonBoundaries();
        if (mounted) {
          setData(boundaries);
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e : new Error('Failed to load polygons'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  // Récupérer un polygone par son nom
  const getPolygonByName = useCallback((name: string): QuarterFeature | null => {
    if (!data) return null;
    return getFeatureByName(data, name);
  }, [data]);

  // Récupérer tous les polygones avec un nom
  const getAllPolygons = useCallback((): QuarterFeature[] => {
    if (!data) return [];
    return getNamedFeatures(data);
  }, [data]);

  // Récupérer les polygones par catégorie
  const getPolygonsByCategory = useCallback((category: string): QuarterFeature[] => {
    if (!data) return [];
    return data.features.filter(f => f.properties?.category === category);
  }, [data]);

  // Recharger les données
  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const boundaries = await loadGabonBoundaries();
      setData(boundaries);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to reload polygons'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    data,
    isLoading,
    error,
    getPolygonByName,
    getAllPolygons,
    getPolygonsByCategory,
    reload,
  };
}

/**
 * Hook pour obtenir les options de quartiers pour le combobox
 * Combine les données OSM existantes avec les polygones
 */
export function useQuarterOptions() {
  const { data: polygonsData, isLoading: polygonsLoading } = useQuarterPolygons();
  
  const options = useMemo(() => {
    if (!polygonsData) return [];
    
    return polygonsData.features
      .filter(f => f.properties?.name)
      .map(f => ({
        name: f.properties!.name!,
        nameFr: f.properties?.nameFr,
        lat: f.properties?.center?.lat ?? 0,
        lon: f.properties?.center?.lon ?? 0,
        placeType: f.properties?.placeType,
        category: f.properties?.category,
        osmId: f.properties?.osmId,
        osmType: f.properties?.osmType,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [polygonsData]);

  return {
    options,
    isLoading: polygonsLoading,
  };
}
