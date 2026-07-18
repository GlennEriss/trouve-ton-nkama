"use client";
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createLogger } from '@/lib/logger';

const logger = createLogger('providers.location');

interface Neighborhood {
  name: string;
  coordinates: [number, number][];
}

interface LocationData {
  country?: string;
  region?: string;
  city?: string;
  countryCode?: string;
  neighbourhood?: string;
  city_district?: string;
}

interface LocationContextType {
  locationsContext: LocationData[];
  currentLocation: LocationData | null;
  setCurrentLocation: (location: LocationData | null) => void;
  setLocationsContext: (locations: LocationData[]) => void;
  getLatitudeAndLongitudeLocation: () => Promise<{
    latitude: number;
    longitude: number;
  }>;
  getUserLocation: () => void;
  getAddressFromCoordinates: (latitude: number, longitude: number) => void;
  getAllNeighborhoods: (city: string) => Promise<Neighborhood[]>;
  getAllNeighborhoodsWithOverpass: (
    province: string
  ) => Promise<Neighborhood[]>;
  address: string;
  isLoading: boolean;
  error: string | null;
  updateLocation: (lat: number, lng: number) => Promise<void>;
  searchAddress: (query: string) => Promise<any[]>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: React.ReactNode;
  initialLat?: number;
  initialLng?: number;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({
  children,
  initialLat,
  initialLng,
}) => {
  const [locationsContext, setLocationsContext] = useState<LocationData[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [address, setAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getAddressFromCoordinates = async (
    latitude: number,
    longitude: number
  ) => {
    try {
      const response = await fetch(
        `/api/geocode?lat=${latitude}&lng=${longitude}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.address) {
        const {
          country,
          state: region,
          city,
          country_code,
          neighbourhood,
          city_district,
        } = data.address;
        const locationData = {
          country,
          region,
          city,
          countryCode: country_code,
          neighbourhood,
          city_district,
        };
        setCurrentLocation(locationData);
        setLocationsContext([locationData]);
        setAddress(data.display_name ?? 'Adresse non trouvée');
        
        // Sauvegarder dans le localStorage
        localStorage.setItem('userLocation', JSON.stringify({
          location: locationData,
          address: data.display_name,
          timestamp: Date.now()
        }));
        
        return data;
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des données', { error });
      setAddress('Adresse non trouvée');
    }
  };

  const getUserLocation = async () => {
    // Vérifier si on a déjà une localisation dans le localStorage
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      const { location, address: savedAddress, timestamp } = JSON.parse(savedLocation);
      // Vérifier si la localisation a moins de 24h
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        setCurrentLocation(location);
        setLocationsContext([location]);
        setAddress(savedAddress);
        return;
      }
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          getAddressFromCoordinates(latitude, longitude);
        },
        (error) => {
          logger.warn('Géolocalisation utilisateur indisponible', { error });
        }
      );
    } else {
      logger.warn("La géolocalisation n'est pas prise en charge");
    }
  };

  const getLatitudeAndLongitudeLocation = async (): Promise<{
    latitude: number;
    longitude: number;
  }> => {
    if ("geolocation" in navigator) {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            resolve({ latitude, longitude });
          },
          (error) => {
            logger.error("Erreur lors de l'obtention de la position géographique", { error });
            reject(
              new Error(
                "Erreur lors de l'obtention de la position géographique"
              )
            );
          }
        );
      });
    } else {
      const errorMessage = "La géolocalisation n'est pas prise en charge";
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getAllNeighborhoods = async (city: string): Promise<Neighborhood[]> => {
    try {
      const response = await fetch(
        `/api/geocode/search?q=${encodeURIComponent(city)}&format=json&polygon_geojson=1&addressdetails=1`
      );
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des quartiers");
      }
      const data = await response.json();
      return data.map((item: any) => ({
        name: item.display_name,
        coordinates: item.geojson.coordinates[0],
      }));
    } catch (error) {
      logger.error("Erreur lors de la récupération des quartiers", { error });
      return [];
    }
  };

  const getAllNeighborhoodsWithOverpass = async (city: string): Promise<Neighborhood[]> => {
    try {
      const overpassQuery = `
        [out:json][timeout:50];
        area["name"="${city}"]["boundary"="administrative"]->.searchArea;
        (
          node["place"="neighbourhood"](area.searchArea);
          node["place"="suburb"](area.searchArea);
          way["place"="neighbourhood"](area.searchArea);
          way["place"="suburb"](area.searchArea);
          relation["place"="neighbourhood"](area.searchArea);
          relation["place"="suburb"](area.searchArea);
        );
        out body;
        >;
        out skel qt;
      `;
  
      const response = await fetch(
        `/api/overpass?data=${encodeURIComponent(overpassQuery)}`
      );
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des quartiers");
      }
  
      const data = await response.json();
  
      return data.elements
        .filter(
          (element: any) =>
            element.type === "relation" || element.type === "way" || element.type === "node"
        )
        .map((element: any) => ({
          name: element.tags?.name ?? "Inconnu",
          coordinates: element.geometry?.map((point: any) => [point.lat, point.lon]) ?? [],
        }));
    } catch (error) {
      logger.error("Erreur lors de la récupération des quartiers via Overpass", { error });
      return [];
    }
  };

  const updateLocation = async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const newAddress = await getAddressFromCoordinates(lat, lng);
      setAddress(newAddress.display_name ?? 'Adresse non trouvée');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const searchAddress = async (query: string): Promise<any[]> => {
    try {
      const response = await fetch(
        `/api/geocode/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Erreur lors de la recherche', { error });
      return [];
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (initialLat && initialLng) {
      updateLocation(initialLat, initialLng);
    }
  }, [initialLat, initialLng]);

  const value = useMemo(() => ({
    locationsContext,
    currentLocation,
    setLocationsContext,
    setCurrentLocation,
    getLatitudeAndLongitudeLocation,
    getUserLocation,
    getAddressFromCoordinates,
    getAllNeighborhoods,
    getAllNeighborhoodsWithOverpass,
    address,
    isLoading,
    error,
    updateLocation,
    searchAddress,
  }), [
    locationsContext,
    currentLocation,
    address,
    isLoading,
    error
  ]);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
