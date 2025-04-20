"use client";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

interface Neighborhood {
  name: string;
  coordinates: [number, number][];
}

interface LocationContextType {
  locationsContext: any | null;
  currentLocation: any | null;
  setCurrentLocation: (...params: any[]) => void;
  setLocationsContext: (...params: any[]) => void;
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
}

export const LocationContext = createContext<LocationContextType>({
  locationsContext: null,
  currentLocation: null,
  setCurrentLocation: (...params: any[]) => {},
  setLocationsContext: (...params: any[]) => {},
  getLatitudeAndLongitudeLocation: async () => ({
    latitude: 0,
    longitude: 0,
  }),
  getUserLocation: async () => {},
  getAddressFromCoordinates: async () => {},
  getAllNeighborhoods: async () => [],
  getAllNeighborhoodsWithOverpass: async () => [],
});

export const useLocationContext = () => {
  const locationContext = useContext(LocationContext);
  if (locationContext === undefined) {
    throw new Error("Context not defined");
  }
  return locationContext;
};

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [locationsContext, setLocationsContext] = useState<any[]>([]);
  const [currentLocation, setCurrentLocation] = useState<any>();
  const { user } = useCurrentUser();

  const getAddressFromCoordinates = async (
    latitude: number,
    longitude: number
  ) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
      );

      if (!response.ok) {
        throw new Error("Réponse du serveur non valide");
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
        setCurrentLocation({
          country,
          region,
          city,
          countryCode: country_code,
          neighbourhood,
          city_district,
        });
        setLocationsContext([
          {
            country,
            region,
            city,
            countryCode: country_code,
            neighbourhood,
            city_district,
          },
        ]);
        return data;
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données", error);
    }
  };

  const getUserLocation = async () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          getAddressFromCoordinates(latitude, longitude);
        },
        (error) => {
          console.error(error);
        }
      );
    } else {
      console.error("La géolocalisation n'est pas prise en charge");
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
            console.error(error);
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
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getAllNeighborhoods = async (city: string): Promise<Neighborhood[]> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${city}&format=json&polygon_geojson=1&addressdetails=1`
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
      console.error("Erreur lors de la récupération des quartiers", error);
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
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`
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
          name: element.tags?.name || "Inconnu",
          coordinates: element.geometry?.map((point: any) => [point.lat, point.lon]) || [],
        }));
    } catch (error) {
      console.error("Erreur lors de la récupération des quartiers :", error);
      return [];
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  return (
    <LocationContext.Provider
      value={{
        locationsContext,
        currentLocation,
        setLocationsContext,
        setCurrentLocation,
        getLatitudeAndLongitudeLocation,
        getUserLocation,
        getAddressFromCoordinates,
        getAllNeighborhoods,
        getAllNeighborhoodsWithOverpass,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
