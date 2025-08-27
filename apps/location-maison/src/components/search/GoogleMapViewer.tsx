'use client';

import { useState, useEffect, useRef } from 'react';
import { useInfiniteHits } from 'react-instantsearch';
import { X } from 'lucide-react';
import { Button } from '../ui/button';

type GoogleMapViewerProps = {
  lat: number;
  lng: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function GoogleMapViewer({ lat, lng, open, onOpenChange }: GoogleMapViewerProps) {
  const { items } = useInfiniteHits();
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Charger l'API Google Maps
  useEffect(() => {
    if (!open || !mapRef.current) return;

    const loadGoogleMaps = async () => {
      // Vérifier si l'API est déjà chargée
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      // Charger l'API Google Maps
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, [open, lat, lng]);

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    // Créer la carte
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 11,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      zoomControl: true,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      gestureHandling: 'greedy',
      scrollwheel: true,
      draggable: true,
      clickableIcons: true,
      keyboardShortcuts: true,
    });

    mapInstanceRef.current = map;

    // Ajouter les marqueurs
    addMarkers(map);
  };

  const addMarkers = (map: any) => {
    // Nettoyer les anciens marqueurs
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Ajouter les nouveaux marqueurs
    items.forEach((property) => {
      if (!property.latitude || !property.longitude) return;

      const marker = new google.maps.Marker({
        position: { lat: property.latitude, lng: property.longitude },
        map: map,
        title: property.title || property.name,
        label: {
          text: property.typeProperty === 'house' ? '🏠' : 
                property.typeProperty === 'apartment' ? '🏢' : 
                property.typeProperty === 'land' ? '🌳' : '🏪',
          className: 'text-2xl'
        },
        clickable: true,
      });

      // Ajouter l'événement de clic
      marker.addListener('click', () => {
        setSelectedProperty(property);
      });

      markersRef.current.push(marker);
    });
  };

  // Gérer la touche Escape
  useEffect(() => {
    if (!open) return;
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onOpenChange]);

  // Si pas ouvert, ne rien afficher
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      {/* Modal principal */}
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">🗺️ Carte des biens</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {items.filter(p => p.latitude && p.longitude).length} biens localisés
            </span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Container de la carte */}
        <div className="flex-1 relative">
          <div 
            ref={mapRef} 
            className="w-full h-full"
            style={{ minHeight: '400px' }}
          />

          {/* Panneau de détails */}
          {selectedProperty && (
            <div className="absolute bottom-6 right-6 w-80 bg-white rounded-xl shadow-xl border border-gray-200">
              <div className="p-6">
                {/* En-tête du panneau */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedProperty.title || selectedProperty.name}
                  </h3>
                  <button
                    onClick={() => setSelectedProperty(null)}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X size={18} className="text-gray-500" />
                  </button>
                </div>

                {/* Image */}
                {selectedProperty.images?.[0] && (
                  <div className="mb-4">
                    <img
                      src={selectedProperty.images[0]}
                      alt={selectedProperty.title || selectedProperty.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* Informations */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type</span>
                    <span className="text-sm font-medium">
                      {selectedProperty.typeProperty === 'house' ? '🏠 Maison' : 
                       selectedProperty.typeProperty === 'apartment' ? '🏢 Appartement' :
                       selectedProperty.typeProperty === 'land' ? '🌳 Terrain' : '🏪 Commercial'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Prix</span>
                    <span className="text-lg font-bold text-[#146B67]">
                      {selectedProperty.price ? `${selectedProperty.price.toLocaleString()} FCFA` : 'Prix sur demande'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Localisation</span>
                    <span className="text-sm font-medium">
                      {selectedProperty.city || selectedProperty.location || 'Non spécifié'}
                    </span>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex gap-3">
                  <Button className="flex-1 bg-[#146B67] hover:bg-[#1FA89B] text-white">
                    Voir les détails
                  </Button>
                  <Button variant="outline" className="flex-1 border-[#146B67] text-[#146B67] hover:bg-[#1FA89B] hover:text-white">
                    Contacter
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
