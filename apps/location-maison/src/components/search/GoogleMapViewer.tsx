'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useInfiniteHits } from 'react-instantsearch';
import {
  X
} from 'lucide-react';
import GoogleMapViewerHeader from './GoogleMapViewerHeader';
import { useGoogleMapInstance } from '@/hooks/google-map/use-google-map-instance';
import { googleMapsSingleton } from '@/singleton';
import { useLocationGoogle } from '@/hooks/google-map/use-location-google';
import { createLogger } from '@/lib/logger';

const logger = createLogger('components.google-map-viewer');
// Import dynamic du composant PropertyDetailsPanel
const PropertyDetailsPanel = dynamic(() => import('./PropertyDetailsPanel'), {
  ssr: false,
  loading: () => (
    <div className="absolute bottom-6 right-6 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-6">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded mb-4"></div>
        <div className="h-32 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  )
});

// Import dynamic du composant PropertyMarker
const PropertyMarker = dynamic(() => import('./PropertyMarker'), {
  ssr: false
});

type GoogleMapViewerProps = {
  lat: number;
  lng: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function GoogleMapViewer({ lat, lng, open, onOpenChange }: GoogleMapViewerProps) {
  const { items } = useInfiniteHits();
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const { mapReady, setMapReady, mapRef, mapInstanceRef, initializeMap } = useGoogleMapInstance(lat, lng);
  const { mediator } = useLocationGoogle();
  const lastFocusKeyRef = useRef<string | null>(null);
  const [locationVersion, setLocationVersion] = useState<string>('');

  // Poll léger pour détecter les changements du médiateur (pas de listener)
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const v = `${mediator.getProvinceLon() ?? ''}|${mediator.getProvinceLat() ?? ''}|${mediator.getCityLon() ?? ''}|${mediator.getCityLat() ?? ''}|${mediator.getStreetLon() ?? ''}|${mediator.getStreetLat() ?? ''}`;
      setLocationVersion((prev) => (prev !== v ? v : prev));
    };
    update();
    const id = setInterval(update, 300);
    return () => clearInterval(id);
  }, [open, mediator]);

  // Initialiser la carte quand la modal s'ouvre
  if (open && !mapInstanceRef.current) {
    initializeMap();
  }

  // Nettoyer l'instance de la carte quand la modal se ferme
  if (!open && mapInstanceRef.current) {
    try {
      // Nettoyer seulement l'instance de la carte, pas le singleton
      mapInstanceRef.current = null;
      setMapReady(false);
    } catch (error) {
      logger.warn('Error cleaning up map instance', { error });
    }
  }

  // Focus automatique selon les coordonnées du médiateur (priorité rue > ville > province)
  useEffect(() => {
    if (!open || !mapReady || !mapInstanceRef.current) return;

    const zoomByType: Record<string, number> = { province: 9, city: 12, street: 15 };

    const streetLon = mediator.getStreetLon();
    const streetLat = mediator.getStreetLat();
    const cityLon = mediator.getCityLon();
    const cityLat = mediator.getCityLat();
    const provLon = mediator.getProvinceLon();
    const provLat = mediator.getProvinceLat();

    let target: { lat: number; lng: number; type: 'street'|'city'|'province' } | null = null;
    if (typeof streetLon === 'number' && typeof streetLat === 'number') {
      target = { lat: streetLat, lng: streetLon, type: 'street' };
    } else if (typeof cityLon === 'number' && typeof cityLat === 'number') {
      target = { lat: cityLat, lng: cityLon, type: 'city' };
    } else if (typeof provLon === 'number' && typeof provLat === 'number') {
      target = { lat: provLat, lng: provLon, type: 'province' };
    }

    if (!target) return;

    const key = `${target.type}:${target.lat},${target.lng}`;
    if (lastFocusKeyRef.current === key) return;
    lastFocusKeyRef.current = key;

    try {
      mapInstanceRef.current.setCenter({ lat: target.lat, lng: target.lng });
      mapInstanceRef.current.setZoom(zoomByType[target.type]);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mapReady, locationVersion]);

  // ESC pour fermer
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex flex-col border-b border-gray-200 p-2">
          <button
            onClick={() => onOpenChange(false)}
            className="lg:hidden hover:bg-gray-100 rounded-full transition-colors ml-auto"
          >
            <X size={24} className="text-gray-500" />
          </button>
          <GoogleMapViewerHeader
            length={items.filter((p: any) => p.latitude && p.longitude).length}
            onOpenChange={onOpenChange}
          />
        </div>


        {/* Carte */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />

          {/* Markers pour chaque propriété avec dynamic loading */}
          {mapReady && mapInstanceRef.current && items.map((property: any, index: number) => {
            // Créer une clé unique basée sur plusieurs propriétés
            const uniqueKey = property.id ||
              `${property.latitude}_${property.longitude}_${property.title || property.name || index}`;

            return (
              <PropertyMarker
                key={uniqueKey}
                property={property}
                map={mapInstanceRef.current}
                AdvancedMarkerElement={googleMapsSingleton.getAdvancedMarkerElement()}
                onPropertyClick={setSelectedProperty}
              />
            );
          })}

          {/* Panneau détails avec dynamic loading */}
          <PropertyDetailsPanel
            selectedProperty={selectedProperty}
            onClose={() => setSelectedProperty(null)}
          />
        </div>
      </div>
    </div>
  );
}
