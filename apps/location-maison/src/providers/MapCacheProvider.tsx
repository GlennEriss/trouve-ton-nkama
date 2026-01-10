'use client';

import { createContext, useContext, useRef, ReactNode, useCallback } from 'react';

// Types
interface Property {
  objectID: string;
  id?: string;
  title?: string;
  name?: string;
  price?: number;
  area?: number;
  street?: string;
  city?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  typeProperty?: string;
  status?: string;
  nbrRooms?: number;
  [key: string]: unknown;
}

interface CacheEntry {
  properties: Property[];
  totalCount: number;
  timestamp: number;
}

interface MapCacheContextType {
  // Opérations de cache
  get: (quarterName: string) => CacheEntry | null;
  set: (quarterName: string, properties: Property[], totalCount: number) => void;
  has: (quarterName: string) => boolean;
  clear: () => void;
  
  // Stats
  getStats: () => { size: number; hits: number; misses: number };
}

const MapCacheContext = createContext<MapCacheContextType | null>(null);

// Configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 50; // Maximum 50 quartiers en cache

interface MapCacheProviderProps {
  children: ReactNode;
}

export function MapCacheProvider({ children }: MapCacheProviderProps) {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const statsRef = useRef({ hits: 0, misses: 0 });

  // Normaliser le nom du quartier pour la clé de cache
  const normalize = (name: string) => name.toLowerCase().trim().replace(/\s+/g, '-');

  // Vérifier si une entrée est expirée
  const isExpired = (entry: CacheEntry) => 
    Date.now() - entry.timestamp > CACHE_TTL_MS;

  // Récupérer une entrée du cache
  const get = useCallback((quarterName: string): CacheEntry | null => {
    const key = normalize(quarterName);
    const entry = cacheRef.current.get(key);
    
    if (!entry) {
      statsRef.current.misses++;
      return null;
    }

    if (isExpired(entry)) {
      cacheRef.current.delete(key);
      statsRef.current.misses++;
      return null;
    }

    statsRef.current.hits++;
    // Mettre à jour l'ordre LRU (supprimer et réajouter)
    cacheRef.current.delete(key);
    cacheRef.current.set(key, entry);
    
    return entry;
  }, []);

  // Ajouter une entrée au cache
  const set = useCallback((quarterName: string, properties: Property[], totalCount: number) => {
    const key = normalize(quarterName);

    // Éviction LRU si cache plein
    if (cacheRef.current.size >= MAX_ENTRIES) {
      const oldestKey = cacheRef.current.keys().next().value;
      if (oldestKey) cacheRef.current.delete(oldestKey);
    }

    cacheRef.current.set(key, {
      properties,
      totalCount,
      timestamp: Date.now()
    });
  }, []);

  // Vérifier si un quartier est en cache
  const has = useCallback((quarterName: string): boolean => {
    const key = normalize(quarterName);
    const entry = cacheRef.current.get(key);
    
    if (!entry) return false;
    if (isExpired(entry)) {
      cacheRef.current.delete(key);
      return false;
    }
    
    return true;
  }, []);

  // Vider le cache
  const clear = useCallback(() => {
    cacheRef.current.clear();
    statsRef.current = { hits: 0, misses: 0 };
  }, []);

  // Obtenir les stats
  const getStats = useCallback(() => ({
    size: cacheRef.current.size,
    ...statsRef.current
  }), []);

  return (
    <MapCacheContext.Provider value={{ get, set, has, clear, getStats }}>
      {children}
    </MapCacheContext.Provider>
  );
}

export function useMapCache() {
  const context = useContext(MapCacheContext);
  if (!context) {
    throw new Error('useMapCache must be used within a MapCacheProvider');
  }
  return context;
}

// Export des types
export type { Property, CacheEntry };
