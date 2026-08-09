'use client';

import { useEffect, useState } from 'react';
import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMapContext, type QuarterLocation } from '@/providers/MapProvider';
import { useQuarterProperties } from '@/hooks/useQuarterProperties';
import QuarterSearchCombobox from './QuarterSearchCombobox';
import MapResultsList from './MapResultsList';
import { Button } from '@/components/ui/button';

interface MapSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function MapSidebar({ isCollapsed = false, onToggle }: MapSidebarProps) {
  const { selectedQuarter, focusOnQuarter, resetMap } = useMapContext();
  const { properties, totalCount, isLoading, fetchProperties, clearProperties } = useQuarterProperties();
  const [highlightedPropertyId, setHighlightedPropertyId] = useState<string | null>(null);

  // Charger les propriétés quand un quartier est sélectionné
  useEffect(() => {
    if (selectedQuarter?.name) {
      fetchProperties(selectedQuarter.name);
    } else {
      clearProperties();
    }
  }, [selectedQuarter?.name, fetchProperties, clearProperties]);

  // Gérer la sélection d'un quartier
  const handleQuarterChange = (quarter: QuarterLocation | null) => {
    if (quarter) {
      focusOnQuarter(quarter);
    } else {
      resetMap();
      clearProperties();
    }
  };

  // Version collapsed (juste le bouton toggle)
  if (isCollapsed) {
    return (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-[1000]">
        <Button
          variant="outline"
          size="icon"
          onClick={onToggle}
          className="rounded-l-none bg-white dark:bg-gray-800 shadow-lg"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-[350px] h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-lg z-[1000]">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Carte du Gabon
          </h2>
          {onToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="lg:hidden"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Combobox de recherche de quartier */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sélectionner un quartier
          </label>
          <QuarterSearchCombobox
            value={selectedQuarter}
            onChange={handleQuarterChange}
            placeholder="Rechercher un quartier..."
          />
        </div>
      </div>

      {/* Info quartier sélectionné */}
      {selectedQuarter && (
        <div className="px-4 py-3 bg-primary/5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {selectedQuarter.name}
              </h3>
              {selectedQuarter.province && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Province : {selectedQuarter.province}
                </p>
              )}
              <p className="text-sm text-primary font-medium mt-1">
                {isLoading ? (
                  'Chargement...'
                ) : (
                  `${totalCount} logement${totalCount > 1 ? 's' : ''} disponible${totalCount > 1 ? 's' : ''}`
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Liste des résultats */}
      <div className="flex-1 overflow-hidden px-4">
        <MapResultsList
          properties={properties}
          isLoading={isLoading}
          totalCount={totalCount}
          highlightedPropertyId={highlightedPropertyId}
          onPropertyHover={setHighlightedPropertyId}
        />
      </div>
    </div>
  );
}
