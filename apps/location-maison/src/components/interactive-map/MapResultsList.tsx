'use client';

import { useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import MapPropertyCard from './MapPropertyCard';
import type { Property } from '@/providers/MapCacheProvider';

interface MapResultsListProps {
  properties: Property[];
  isLoading: boolean;
  totalCount: number;
  highlightedPropertyId?: string | null;
  onPropertyHover?: (propertyId: string | null) => void;
}

export default function MapResultsList({
  properties,
  isLoading,
  totalCount,
  highlightedPropertyId,
  onPropertyHover,
}: MapResultsListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll vers le haut quand les propriétés changent
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [properties]);

  // État de chargement
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-gray-500">Chargement des logements...</p>
      </div>
    );
  }

  // Aucun résultat
  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">
          Aucun logement trouvé
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Sélectionnez un quartier pour voir les logements disponibles
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header avec compteur */}
      <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Logements disponibles
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
          {totalCount} résultat{totalCount > 1 ? 's' : ''}
        </span>
      </div>

      {/* Liste scrollable */}
      <div 
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-3 py-3 pr-1"
        style={{ maxHeight: 'calc(100vh - 320px)' }}
      >
        {properties.map((property) => (
          <MapPropertyCard
            key={property.objectID || property.id}
            property={property}
            isHighlighted={highlightedPropertyId === (property.objectID || property.id)}
            onMouseEnter={() => onPropertyHover?.(property.objectID || property.id || null)}
            onMouseLeave={() => onPropertyHover?.(null)}
          />
        ))}
      </div>
    </div>
  );
}
