/**
 * Hook pour charger et accéder aux données OSM du Gabon
 * Fournit les données structurées pour les combobox de sélection de localisation
 */

import { useMemo } from 'react';
import { getOSMLocations, OSMLocation, OSMLocationsData } from '@/data/gabon-osm-locations';

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

/**
 * Hook principal pour accéder aux données OSM
 * Les données sont chargées de manière synchrone au build (pas de chargement async)
 */
export function useOSMLocations(): UseOSMLocationsReturn {
  // Charger les données une seule fois (cache en mémoire via getOSMLocations)
  const data = useMemo(() => {
    try {
      return getOSMLocations();
    } catch (error) {
      console.error('Erreur lors du chargement des données OSM:', error);
      return null;
    }
  }, []);

  const isLoading = false; // Les données sont chargées de manière synchrone
  const error = data === null ? new Error('Impossible de charger les données OSM') : null;

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

