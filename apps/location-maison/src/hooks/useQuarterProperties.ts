/**
 * Hook pour récupérer les propriétés d'un quartier avec cache
 */

import { useState, useCallback } from 'react';
import { useMapCache, type Property } from '@/providers/MapCacheProvider';
import { createLogger } from '@/lib/logger';

const logger = createLogger('hooks.use-quarter-properties');

interface UseQuarterPropertiesReturn {
  properties: Property[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
  fetchProperties: (quarterName: string) => Promise<void>;
  clearProperties: () => void;
}

export function useQuarterProperties(): UseQuarterPropertiesReturn {
  const [properties, setProperties] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const cache = useMapCache();

  const fetchProperties = useCallback(async (quarterName: string) => {
    if (!quarterName) {
      setProperties([]);
      setTotalCount(0);
      return;
    }

    // 1. Vérifier le cache client d'abord
    const cached = cache.get(quarterName);
    
    if (cached) {
      logger.debug('Quarter properties cache hit', {
        quarterName,
        count: cached.properties.length,
      });
      setProperties(cached.properties);
      setTotalCount(cached.totalCount);
      setError(null);
      return;
    }

    // 2. Si pas en cache, faire la requête API
    logger.debug('Quarter properties cache miss', { quarterName });
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/map/properties?quarter=${encodeURIComponent(quarterName)}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // 3. Stocker en cache pour usage futur
      cache.set(quarterName, data.properties || [], data.totalCount || 0);
      
      setProperties(data.properties || []);
      setTotalCount(data.totalCount || 0);
    } catch (e) {
      logger.error('Failed to fetch quarter properties', { quarterName, error: e });
      setError(e instanceof Error ? e : new Error('Failed to fetch properties'));
      setProperties([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [cache]);

  const clearProperties = useCallback(() => {
    setProperties([]);
    setTotalCount(0);
    setError(null);
  }, []);

  return {
    properties,
    totalCount,
    isLoading,
    error,
    fetchProperties,
    clearProperties,
  };
}
