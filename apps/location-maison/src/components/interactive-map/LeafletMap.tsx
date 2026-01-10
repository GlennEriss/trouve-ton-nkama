'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapContext, type QuarterLocation } from '@/providers/MapProvider';
import { useQuarterPolygons } from '@/hooks/useQuarterPolygons';
import type { QuarterFeature } from '@/data/gabon-boundaries-loader';
import type { Property } from '@/providers/MapCacheProvider';

// Fix pour les icônes Leaflet en Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Styles des polygones
const POLYGON_STYLES = {
  default: { 
    color: '#6B7280', 
    weight: 1, 
    fillOpacity: 0.1,
    fillColor: '#9CA3AF'
  },
  hover: { 
    color: '#F97316', 
    weight: 2, 
    fillOpacity: 0.15,
    fillColor: '#FDBA74'
  },
  selected: { 
    color: '#EA580C', 
    weight: 3, 
    fillOpacity: 0.35, 
    fillColor: '#F97316' 
  }
};

// Props
interface LeafletMapProps {
  properties?: Property[];
  onPropertyClick?: (property: Property) => void;
}

export default function LeafletMap({ properties = [], onPropertyClick }: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [containerReady, setContainerReady] = useState(false);
  
  const { 
    selectedQuarter, 
    hoveredQuarter, 
    setHoveredQuarter,
    mapCenter,
    mapZoom,
    focusOnQuarter
  } = useMapContext();
  
  const { data: polygonsData, isLoading } = useQuarterPolygons();

  // Icône personnalisée pour les propriétés
  const propertyIcon = useMemo(() => L.divIcon({
    className: 'property-marker',
    html: `<div style="
      background-color: #146B67;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  }), []);

  // Formater le prix
  const formatPrice = (price?: number) => {
    if (!price) return 'Prix non défini';
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  // Style dynamique pour chaque feature
  const getFeatureStyle = useCallback((feature?: QuarterFeature) => {
    const featureName = feature?.properties?.name;
    
    if (selectedQuarter?.name === featureName) {
      return POLYGON_STYLES.selected;
    }
    
    if (hoveredQuarter === featureName) {
      return POLYGON_STYLES.hover;
    }
    
    return POLYGON_STYLES.default;
  }, [selectedQuarter, hoveredQuarter]);

  // Détecter quand le conteneur est monté
  useEffect(() => {
    // Petit délai pour s'assurer que le DOM est prêt
    const timer = setTimeout(() => {
      if (mapContainerRef.current) {
        setContainerReady(true);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Initialiser la carte quand le conteneur est prêt
  useEffect(() => {
    if (!containerReady) return;
    
    const container = mapContainerRef.current;
    if (!container) return;

    // Vérifier si une carte existe déjà sur ce conteneur
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((container as any)._leaflet_id) return;
    
    // Créer la carte
    const map = L.map(container, {
      center: mapCenter,
      zoom: mapZoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Ajouter la couche de tuiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Créer le layer group pour les marqueurs
    markersLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;
    setIsMapReady(true);

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
      geoJsonLayerRef.current = null;
      markersLayerRef.current = null;
      setIsMapReady(false);
    };
  }, [containerReady]); // Dépend de containerReady

  // Mettre à jour le centre et le zoom
  useEffect(() => {
    if (mapRef.current && isMapReady) {
      mapRef.current.setView(mapCenter, mapZoom, { animate: true });
    }
  }, [mapCenter, mapZoom, isMapReady]);

  // Ajouter les polygones GeoJSON
  useEffect(() => {
    if (!mapRef.current || !isMapReady || !polygonsData) return;

    // Supprimer l'ancienne couche
    if (geoJsonLayerRef.current) {
      mapRef.current.removeLayer(geoJsonLayerRef.current);
    }

    // Créer la nouvelle couche GeoJSON
    const geoJsonLayer = L.geoJSON(polygonsData, {
      style: (feature) => getFeatureStyle(feature as QuarterFeature),
      onEachFeature: (feature, layer) => {
        const featureName = (feature as QuarterFeature).properties?.name;
        if (!featureName) return;

        // Tooltip avec le nom
        layer.bindTooltip(featureName, {
          permanent: false,
          direction: 'center',
          className: 'quarter-tooltip'
        });

        // Événements
        layer.on({
          mouseover: () => {
            setHoveredQuarter(featureName);
          },
          mouseout: () => {
            setHoveredQuarter(null);
          },
          click: () => {
            const center = (feature as QuarterFeature).properties?.center;
            if (center) {
              const quarter: QuarterLocation = {
                name: featureName,
                lat: center.lat,
                lon: center.lon,
                placeType: (feature as QuarterFeature).properties?.placeType || undefined,
              };
              focusOnQuarter(quarter);
            }
          }
        });
      }
    });

    geoJsonLayer.addTo(mapRef.current);
    geoJsonLayerRef.current = geoJsonLayer;

  }, [polygonsData, isMapReady, getFeatureStyle, setHoveredQuarter, focusOnQuarter]);

  // Mettre à jour les styles des polygones quand la sélection change
  useEffect(() => {
    if (geoJsonLayerRef.current) {
      geoJsonLayerRef.current.setStyle((feature) => getFeatureStyle(feature as QuarterFeature));
    }
  }, [selectedQuarter, hoveredQuarter, getFeatureStyle]);

  // Ajouter les marqueurs de propriétés
  useEffect(() => {
    if (!markersLayerRef.current || !isMapReady) return;

    // Supprimer les anciens marqueurs
    markersLayerRef.current.clearLayers();

    // Ajouter les nouveaux marqueurs
    properties.forEach((property) => {
      if (!property.latitude || !property.longitude) return;

      const marker = L.marker([property.latitude, property.longitude], {
        icon: propertyIcon
      });

      // Popup
      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="font-weight: 600; color: #111827; margin-bottom: 4px;">
            ${property.title || property.name || 'Propriété'}
          </h3>
          <p style="color: #146B67; font-weight: 700;">
            ${formatPrice(property.price)}
          </p>
          ${property.street ? `<p style="font-size: 14px; color: #6B7280;">${property.street}</p>` : ''}
          ${property.area ? `<p style="font-size: 14px; color: #6B7280;">${property.area} m²</p>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'property-popup'
      });

      marker.on('click', () => {
        onPropertyClick?.(property);
      });

      marker.addTo(markersLayerRef.current!);
    });
  }, [properties, isMapReady, propertyIcon, onPropertyClick]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Chargement de la carte...</div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .quarter-tooltip {
          background-color: rgba(0, 0, 0, 0.8);
          border: none;
          border-radius: 4px;
          color: white;
          font-size: 12px;
          padding: 4px 8px;
        }
        .property-marker {
          background: transparent;
          border: none;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        .leaflet-popup-content {
          margin: 12px;
        }
        .property-popup .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
      `}</style>
      
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
    </>
  );
}
