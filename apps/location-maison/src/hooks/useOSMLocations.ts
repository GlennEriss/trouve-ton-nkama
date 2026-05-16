/**
 * Hook pour charger et accéder aux données OSM du Gabon
 * Fournit les données structurées pour les combobox de sélection de localisation
 */

import { useEffect, useMemo, useState } from 'react';
import {
  OSMLocation,
  OSMLocationsData,
  OSMLocationsSerializable,
  deserializeOSMLocationsData,
  getOSMLocations,
} from '@/data/gabon-osm-locations';
import { createLogger } from '@/lib/logger';

const logger = createLogger('hooks.use-osm-locations');

export interface UseOSMLocationsReturn {
  // Données brutes
  data: OSMLocationsData | null;
  isLoading: boolean;
  error: Error | null;

  // Helpers pour filtrage
  getCitiesByProvince: (province: string) => OSMLocation[];
  getQuartersByCity: (city: string) => OSMLocation[];
  getQuartersByProvince: (province: string) => OSMLocation[];
  getAllProvinces: () => OSMLocation[];
  getAllCities: () => OSMLocation[];
  getAllQuarters: () => OSMLocation[];
}

interface GabonOsmApiResponse {
  success: boolean;
  data?: OSMLocationsSerializable;
  error?: {
    code?: string;
    message?: string;
  };
}

let cachedOsmData: OSMLocationsData | null = null;
let cachedOsmError: Error | null = null;
let cachedOsmPromise: Promise<OSMLocationsData | null> | null = null;

function getLocalFallbackData() {
  try {
    return getOSMLocations();
  } catch (error) {
    logger.warn('Fallback OSM local indisponible', { error });
    return null;
  }
}

async function loadFromApi() {
  const response = await fetch('/api/location/osm/gabon', {
    method: 'GET',
    cache: 'no-store',
  });

  const payload = (await response.json()) as GabonOsmApiResponse;
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? 'Impossible de charger les données OSM distantes');
  }

  return deserializeOSMLocationsData(payload.data);
}

async function loadOsmDataOnce() {
  if (cachedOsmData) {
    return cachedOsmData;
  }
  if (cachedOsmPromise) {
    return cachedOsmPromise;
  }

  cachedOsmPromise = (async () => {
    try {
      const fromApi = await loadFromApi();
      cachedOsmData = fromApi;
      cachedOsmError = null;
      return fromApi;
    } catch (apiError) {
      logger.warn('Chargement OSM via API indisponible, fallback local', { error: apiError });
      const fallback = getLocalFallbackData();
      if (fallback) {
        cachedOsmData = fallback;
        cachedOsmError = null;
        return fallback;
      }
      const error =
        apiError instanceof Error
          ? apiError
          : new Error('Impossible de charger les données OSM (API + local)');
      cachedOsmError = error;
      return null;
    } finally {
      cachedOsmPromise = null;
    }
  })();

  return cachedOsmPromise;
}

/**
 * Hook principal pour accéder aux données OSM
 * Les données sont chargées depuis l'API (cloud + fallback local) avec cache en mémoire.
 */
export function useOSMLocations(): UseOSMLocationsReturn {
  const [data, setData] = useState<OSMLocationsData | null>(() => cachedOsmData);
  const [isLoading, setIsLoading] = useState<boolean>(() => !cachedOsmData);
  const [error, setError] = useState<Error | null>(() => cachedOsmError);

  useEffect(() => {
    let mounted = true;

    if (!cachedOsmData && !cachedOsmPromise) {
      setIsLoading(true);
    }

    void loadOsmDataOnce().then((result) => {
      if (!mounted) return;
      if (result) {
        setData(result);
        setError(null);
      } else if (cachedOsmError) {
        setError(cachedOsmError);
      } else {
        setError(new Error('Impossible de charger les données OSM'));
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Helper: Récupérer toutes les provinces
  const getAllProvinces = useMemo(() => {
    return () => data?.provinces || [];
  }, [data]);

  // Helper: Récupérer toutes les villes
  const getAllCities = useMemo(() => {
    return () => data?.cities || [];
  }, [data]);

  // Helper: Récupérer tous les quartiers
  const getAllQuarters = useMemo(() => {
    return () => data?.quarters || [];
  }, [data]);

  // Helper: Récupérer les villes d'une province
  const getCitiesByProvince = useMemo(() => {
    return (province: string): OSMLocation[] => {
      if (!data || !province) return [];
      return data.cities.filter((city) => data.cityToProvince.get(city.name) === province);
    };
  }, [data]);

  // Helper: Récupérer les quartiers d'une ville
  const getQuartersByCity = useMemo(() => {
    return (city: string): OSMLocation[] => {
      if (!data || !city) return [];
      return data.quarters.filter((quarter) => data.quarterToCity.get(quarter.name) === city);
    };
  }, [data]);

  // Helper: Récupérer les quartiers d'une province (directement ou via ville)
  const getQuartersByProvince = useMemo(() => {
    return (province: string): OSMLocation[] => {
      if (!data || !province) return [];

      // Quartiers rattachés directement à la province
      const directQuarters = data.quarters.filter(
        (quarter) => data.quarterToProvince.get(quarter.name) === province
      );

      // Quartiers via villes de la province
      const citiesInProvince = getCitiesByProvince(province);
      const viaCityQuarters = data.quarters.filter((quarter) => {
        const quarterCity = data.quarterToCity.get(quarter.name);
        return quarterCity && citiesInProvince.some((city) => city.name === quarterCity);
      });

      // Fusionner et dédupliquer
      const allQuarters = [...directQuarters, ...viaCityQuarters];
      const seen = new Set<string>();
      return allQuarters.filter((quarter) => {
        const key = `${quarter.name}_${quarter.lat}_${quarter.lon}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
  }, [data]);

  return {
    data,
    isLoading,
    error,
    getCitiesByProvince,
    getQuartersByCity,
    getQuartersByProvince,
    getAllProvinces,
    getAllCities,
    getAllQuarters,
  };
}
