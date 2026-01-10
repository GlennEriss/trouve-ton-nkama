'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types
export interface QuarterLocation {
  name: string;
  lat: number;
  lon: number;
  province?: string;
  city?: string;
  placeType?: string;
  osmId?: string;
  osmType?: string;
}

interface MapContextType {
  // État de sélection
  selectedQuarter: QuarterLocation | null;
  setSelectedQuarter: (quarter: QuarterLocation | null) => void;
  
  // État de la carte
  mapCenter: [number, number];
  setMapCenter: (center: [number, number]) => void;
  mapZoom: number;
  setMapZoom: (zoom: number) => void;
  
  // État de hover
  hoveredQuarter: string | null;
  setHoveredQuarter: (name: string | null) => void;
  
  // Actions
  focusOnQuarter: (quarter: QuarterLocation) => void;
  resetMap: () => void;
  
  // État de chargement
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const MapContext = createContext<MapContextType | null>(null);

// Configuration par défaut - Centre du Gabon
const DEFAULT_CENTER: [number, number] = [0.4162, 9.4673];
const DEFAULT_ZOOM = 7;
const QUARTER_ZOOM = 14;

interface MapProviderProps {
  children: ReactNode;
}

export function MapProvider({ children }: MapProviderProps) {
  // État de sélection
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterLocation | null>(null);
  
  // État de la carte
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  
  // État de hover
  const [hoveredQuarter, setHoveredQuarter] = useState<string | null>(null);
  
  // État de chargement
  const [isLoading, setIsLoading] = useState(false);

  // Focus sur un quartier
  const focusOnQuarter = useCallback((quarter: QuarterLocation) => {
    setSelectedQuarter(quarter);
    setMapCenter([quarter.lat, quarter.lon]);
    setMapZoom(QUARTER_ZOOM);
  }, []);

  // Reset de la carte
  const resetMap = useCallback(() => {
    setSelectedQuarter(null);
    setMapCenter(DEFAULT_CENTER);
    setMapZoom(DEFAULT_ZOOM);
    setHoveredQuarter(null);
  }, []);

  return (
    <MapContext.Provider
      value={{
        selectedQuarter,
        setSelectedQuarter,
        mapCenter,
        setMapCenter,
        mapZoom,
        setMapZoom,
        hoveredQuarter,
        setHoveredQuarter,
        focusOnQuarter,
        resetMap,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}

// Export des constantes
export { DEFAULT_CENTER, DEFAULT_ZOOM, QUARTER_ZOOM };
