
'use client';

import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { useState } from 'react';
import { useInfiniteHits } from 'react-instantsearch';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

type GoogleMapViewerProps = {
  lat: number;
  lng: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function GoogleMapViewer({ lat, lng, open, onOpenChange }: GoogleMapViewerProps) {
  const { items } = useInfiniteHits();
  const [selectedProperty, setSelectedProperty] = useState<any>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-[95vw] h-[90vh] p-0 flex gap-0 flex-col">
        <DialogHeader className="p-4 border-b bg-white flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <span>🗺️ Carte des biens immobiliers</span>
            <span className="text-sm font-normal text-gray-500">
              ({items.filter(p => p.latitude && p.longitude).length} biens localisés)
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Carte Google Maps */}
        <div className="flex-1 relative min-h-0">
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
            <Map
              center={{ lat, lng }}
              zoom={11}
              mapId=""
              style={{ width: '100%', height: '100%' }}
              gestureHandling={'greedy'}
              disableDefaultUI={false}
            >
              {items.map((property) => {
                // Vérifier si la propriété a des coordonnées
                if (property.latitude && property.longitude) {
                  return (
                    <Marker
                      key={property.objectID}
                      position={{ 
                        lat: property.latitude, 
                        lng: property.longitude 
                      }}
                      onClick={() => setSelectedProperty(property)}
                      title={property.title || property.name}
                      // Utiliser des marqueurs simples pour éviter l'erreur "google is not defined"
                      label={{
                        text: property.typeProperty === 'house' ? '🏠' : 
                              property.typeProperty === 'apartment' ? '🏢' : 
                              property.typeProperty === 'land' ? '🌳' : '🏪',
                        className: 'text-2xl'
                      }}
                    />
                  );
                }
                return null;
              })}
            </Map>
          </APIProvider>

          {/* Panneau de détails flottant */}
          {selectedProperty && (
            <div className="absolute bottom-6 right-6 z-20 w-80">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 p-6">
                {/* En-tête avec bouton fermer */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedProperty.title || selectedProperty.name}
                  </h3>
                  <button
                    onClick={() => setSelectedProperty(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} color="#6b7280" />
                  </button>
                </div>
                
                {/* Image du bien */}
                {selectedProperty.images && selectedProperty.images[0] && (
                  <div className="mb-4">
                    <img
                      src={selectedProperty.images[0]}
                      alt={selectedProperty.title || selectedProperty.name}
                      className="w-full h-32 object-cover rounded-xl"
                    />
                  </div>
                )}
                
                {/* Informations du bien */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Type</span>
                    <span className="text-sm font-medium capitalize">
                      {selectedProperty.typeProperty === 'house' ? '🏠 Maison' : 
                       selectedProperty.typeProperty === 'apartment' ? '🏢 Appartement' :
                       selectedProperty.typeProperty === 'land' ? '🌳 Terrain' : '🏪 Commercial'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Prix</span>
                    <span className="text-lg font-bold text-[#146B67]">
                      {selectedProperty.price ? `${selectedProperty.price.toLocaleString()} FCFA` : 'Prix sur demande'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Localisation</span>
                    <span className="text-sm font-medium">
                      {selectedProperty.city || selectedProperty.location || 'Non spécifié'}
                    </span>
                  </div>
                  
                  {selectedProperty.latitude && selectedProperty.longitude && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Coordonnées</span>
                      <span className="text-xs font-mono text-gray-500">
                        {selectedProperty.latitude.toFixed(4)}, {selectedProperty.longitude.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex gap-3">
                  <Button className="flex-1 bg-[#146B67] hover:bg-[#1FA89B] text-white">
                    Voir les détails
                  </Button>
                  <Button variant="outline" className="flex-1 border-[#146B67] text-[#146B67] hover:bg-[#146B67] hover:text-white">
                    Contacter l'agent
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
