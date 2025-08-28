'use client';

import { useState, useEffect, useRef } from 'react';
import { useInfiniteHits } from 'react-instantsearch';
import { createRoot, Root } from 'react-dom/client';
import {
  X,
  Home as HomeIcon,
  Building2,
  Store,
  Bed,
  Briefcase,
  Trees
} from 'lucide-react';
import { Button } from '../ui/button';
import { TypeProperty, TypePropertyEnum } from '@/constantes/property-type';

type GoogleMapViewerProps = {
  lat: number;
  lng: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MarkerHandle = {
  marker: any;
  root: Root;
  el: HTMLDivElement;
};

const TYPE_ICON_MAP: Record<string, any> = {
  // logements
  home: HomeIcon,
  villa: HomeIcon,
  logement: HomeIcon,
  property: HomeIcon,

  // habitat collectif
  apartment: Building2,
  building: Building2,

  // petites surfaces / chambre
  studio: Bed,
  room: Bed,

  // commerce
  shop: Store,
  kiosk: Store,

  // bureau
  desk: Briefcase,

  // terrain
  land: Trees
};

function normalizeType(t?: string) {
  if (!t) return 'home';
  const k = String(t).toLowerCase().trim();
  if (k === 'house') return 'home';
  if (k === 'logement') return 'logement';
  if (k === 'villa') return 'villa';
  if (k === 'terrain') return 'land';
  if (k === 'magasin') return 'shop';
  if (k === 'bureau') return 'desk';
  if (k === 'immeuble') return 'building';
  if (k === 'chambre') return 'room';
  if (k === 'studio') return 'studio';
  if (k === 'appartement') return 'apartment';
  return k;
}

// Fonction pour traduire le type de propriété en français
function translatePropertyType(type?: string): string {
  if (!type) return 'Non spécifié';
  
  const normalizedType = normalizeType(type);
  
  // Mappage des types normalisés vers les traductions françaises
  const typeTranslations: Record<string, string> = {
    'home': 'Maison',
    'villa': 'Villa',
    'logement': 'Logement',
    'property': 'Propriété',
    'apartment': 'Appartement',
    'building': 'Immeuble',
    'studio': 'Studio',
    'room': 'Chambre',
    'shop': 'Magasin',
    'kiosk': 'Kiosque',
    'desk': 'Bureau',
    'land': 'Terrain'
  };
  
  return typeTranslations[normalizedType] || normalizedType;
}

function shortPrice(p?: number) {
  if (!p || p <= 0) return '—';
  if (p >= 1_000_000) {
    const v = p / 1_000_000;
    return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (p >= 1_000) return `${Math.round(p / 1000)}K`;
  return `${p}`;
}

export default function GoogleMapViewer({ lat, lng, open, onOpenChange }: GoogleMapViewerProps) {
  const { items } = useInfiniteHits();
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<MarkerHandle[]>([]);
  const styleInjected = useRef(false);

  // Injecte le style des markers (une seule fois)
  useEffect(() => {
    if (styleInjected.current) return;
    const style = document.createElement('style');
    style.textContent = `
      .lg-marker {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 9999px;
        background: #fff;
        border: 1px solid rgba(0,0,0,0.08);
        box-shadow: 0 6px 18px rgba(0,0,0,0.12);
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji';
        color: #111827;
        transform: translateY(-8px);
        cursor: pointer;
        user-select: none;
      }
      .lg-marker .price {
        font-weight: 700;
        font-size: 12px;
        line-height: 1;
        letter-spacing: .2px;
      }
      .lg-marker .unit {
        font-weight: 600;
        font-size: 10px;
        opacity: .6;
        margin-left: 2px;
      }
      .lg-marker .icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        color: #146B67;
      }
      .lg-marker:hover {
        border-color: rgba(20,107,103,0.35);
        box-shadow: 0 10px 24px rgba(20,107,103,0.20);
      }
    `;
    document.head.appendChild(style);
    styleInjected.current = true;
  }, []);

  // Charger l'API Google Maps
  useEffect(() => {
    if (!open || !mapRef.current) return;

    const loadGoogleMaps = async () => {
      if ((window as any).google?.maps) {
        initializeMap();
        return;
      }
      const script = document.createElement('script');
      // ⚠️ ajouter 'marker' pour AdvancedMarkerElement
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    };

    loadGoogleMaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lat, lng]);

  const initializeMap = () => {
    if (!mapRef.current || !(window as any).google) return;

    const map = new (window as any).google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 11,
      mapTypeId: (window as any).google.maps.MapTypeId.ROADMAP,
      zoomControl: true,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      gestureHandling: 'greedy',
      scrollwheel: true,
      draggable: true,
      clickableIcons: true,
      keyboardShortcuts: true
    });

    mapInstanceRef.current = map;
    addMarkers(map);
  };

  // Recrée les markers quand les résultats évoluent
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    addMarkers(mapInstanceRef.current);
  }, [items]);

  const clearMarkers = () => {
    markersRef.current.forEach(({ marker, root, el }) => {
      try {
        marker?.map && marker.map(null);
      } catch {}
      try {
        root?.unmount();
      } catch {}
      try {
        el?.remove();
      } catch {}
    });
    markersRef.current = [];
  };

  const addMarkers = (map: any) => {
    clearMarkers();

    const google = (window as any).google;
    const AdvancedMarker = google.maps.marker?.AdvancedMarkerElement;

    items.forEach((property: any) => {
      const lat = Number(property.latitude);
      const lng = Number(property.longitude);
      if (!lat || !lng) return;

      const t = normalizeType(property.typeProperty || property.type || property.category);
      const IconCmp = TYPE_ICON_MAP[t] || HomeIcon;

      // contenu HTML du marker
      const el = document.createElement('div');
      el.className = 'lg-marker';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');

      const iconSpan = document.createElement('span');
      iconSpan.className = 'icon';
      el.appendChild(iconSpan);

      const priceSpan = document.createElement('span');
      priceSpan.className = 'price';
      priceSpan.textContent = shortPrice(property.price);
      el.appendChild(priceSpan);

      const unitSpan = document.createElement('span');
      unitSpan.className = 'unit';
      unitSpan.textContent = property.price ? 'FCFA' : '';
      el.appendChild(unitSpan);

      // on rend l'icône Lucide dans le span
      const root = createRoot(iconSpan);
      root.render(<IconCmp size={18} strokeWidth={2} />);

      // AdvancedMarker pour contenu custom
      let marker: any;

      if (AdvancedMarker) {
        marker = new AdvancedMarker({
          map,
          position: { lat, lng },
          title: property.title || property.name || '',
          content: el,
          gmpClickable: true
        });
      } else {
        // fallback classique si pas de lib 'marker'
        marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: property.title || property.name || '',
          // on met l'HTML dans un label minimaliste (sans icône)
          label: {
            text: `${shortPrice(property.price)} FCFA`,
            className: 'text-xs font-semibold bg-white px-2 py-1 rounded-lg border shadow'
          }
        });
      }

      marker.addListener('click', () => setSelectedProperty(property));

      markersRef.current.push({ marker, root, el });
    });
  };

  // Gérer la touche Escape pour fermer
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
      {/* Modal principal */}
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">🗺️ Carte des biens</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {items.filter((p: any) => p.latitude && p.longitude).length} biens localisés
            </span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Carte */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />

          {/* Panneau de détails */}
          {selectedProperty && (
            <div className="absolute bottom-6 right-6 w-80 bg-white rounded-xl shadow-xl border border-gray-200">
              <div className="p-6">
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

                {selectedProperty.images?.[0] && (
                  <div className="mb-4">
                    <img
                      src={selectedProperty.images[0].fileURL}
                      alt={selectedProperty.title || selectedProperty.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type</span>
                    <span className="text-sm font-medium capitalize">
                      {translatePropertyType(selectedProperty.typeProperty)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Prix</span>
                    <span className="text-lg font-bold text-[#146B67]">
                      {selectedProperty.price
                        ? `${selectedProperty.price.toLocaleString()} FCFA`
                        : 'Prix sur demande'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Localisation</span>
                    <span className="text-sm font-medium">
                      {selectedProperty.city || selectedProperty.location || 'Non spécifié'}
                    </span>
                  </div>
                </div>

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
