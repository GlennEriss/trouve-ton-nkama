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
  Trees,
  Search
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAlgoliaContext } from '@/providers/AlgoliaContext';
import { useRouter } from 'next/navigation';
import { Loader } from '@googlemaps/js-api-loader';

type GoogleMapViewerProps = {
  lat: number;
  lng: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MarkerHandle = {
  marker: any;
  root: Root | null;
  el: HTMLDivElement | null;
};

const TYPE_ICON_MAP: Record<string, any> = {
  home: HomeIcon,
  villa: HomeIcon,
  logement: HomeIcon,
  property: HomeIcon,
  apartment: Building2,
  building: Building2,
  studio: Bed,
  room: Bed,
  shop: Store,
  kiosk: Store,
  desk: Briefcase,
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

function translatePropertyType(type?: string): string {
  if (!type) return 'Non spécifié';
  const normalizedType = normalizeType(type);
  const typeTranslations: Record<string, string> = {
    home: 'Maison',
    villa: 'Villa',
    logement: 'Logement',
    property: 'Propriété',
    apartment: 'Appartement',
    building: 'Immeuble',
    studio: 'Studio',
    room: 'Chambre',
    shop: 'Magasin',
    kiosk: 'Kiosque',
    desk: 'Bureau',
    land: 'Terrain'
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

// --- Singleton du loader pour éviter le double-chargement
let mapsLoader: Loader | null = null;
function getMapsLoader() {
  if (!mapsLoader) {
    mapsLoader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
      version: 'weekly',
      libraries: ['places', 'marker'], // <-- IMPORTANT
    });
  }
  return mapsLoader;
}

export default function GoogleMapViewer({ lat, lng, open, onOpenChange }: GoogleMapViewerProps) {
  const { items } = useInfiniteHits();
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<MarkerHandle[]>([]);
  const styleInjected = useRef(false);
  const router = useRouter();
  const { searchText, setSearchText } = useAlgoliaContext();

  // Style markers (une fois)
  useEffect(() => {
    if (styleInjected.current) return;
    const style = document.createElement('style');
    style.textContent = `
      .lg-marker {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 6px 10px; border-radius: 9999px;
        background: #fff; border: 1px solid rgba(0,0,0,0.08);
        box-shadow: 0 6px 18px rgba(0,0,0,0.12);
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji';
        color: #111827; transform: translateY(-8px);
        cursor: pointer; user-select: none;
      }
      .lg-marker .price { font-weight: 700; font-size: 12px; line-height: 1; letter-spacing: .2px; }
      .lg-marker .unit { font-weight: 600; font-size: 10px; opacity: .6; margin-left: 2px; }
      .lg-marker .icon { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; color: #146B67; }
      .lg-marker:hover { border-color: rgba(20,107,103,0.35); box-shadow: 0 10px 24px rgba(20,107,103,0.20); }
    `;
    document.head.appendChild(style);
    styleInjected.current = true;
  }, []);

  // Init carte quand la modal s’ouvre
  useEffect(() => {
    if (!open || !mapRef.current) return;

    const init = async () => {
      try {
        const loader = getMapsLoader();
        // Charge l’API (une fois) – évite les scripts manuels
        await loader.load();
        if (!(window as any).google?.maps) throw new Error('Google Maps introuvable après chargement.');

        // Vérifie la présence d’AdvancedMarkerElement
        const AdvancedMarkerElement = (window as any).google?.maps?.marker?.AdvancedMarkerElement;
        if (!AdvancedMarkerElement) {
          throw new Error('AdvancedMarkerElement indisponible. Vérifie `libraries: [\'marker\']` et la version.');
        }

        // Crée la carte
        const map = new (window as any).google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 11,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID, // Style de carte personnalisé
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
        (mapInstanceRef as any).AdvancedMarkerElement = AdvancedMarkerElement;

        addMarkers(map, AdvancedMarkerElement);
      } catch (err) {
        console.error('Erreur lors de l’initialisation de la carte:', err);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lat, lng]);

  // Recrée les markers à chaque changement d’items
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const AdvancedMarkerElement = (mapInstanceRef as any).AdvancedMarkerElement;
    if (AdvancedMarkerElement) addMarkers(mapInstanceRef.current, AdvancedMarkerElement);
  }, [items]);

  // Nettoyage markers
  const clearMarkers = () => {
    markersRef.current.forEach(({ marker, root, el }) => {
      try { if (marker) marker.map = null; } catch {}
      try { root?.unmount(); } catch {}
      try { el?.remove(); } catch {}
    });
    markersRef.current = [];
  };

  // Ajout markers (AdvancedMarkerElement only)
  const addMarkers = (map: any, AdvancedMarkerElement: any) => {
    clearMarkers();
    if (!AdvancedMarkerElement) return;

    items.forEach((property: any) => {
      const plat = Number(property.latitude);
      const plng = Number(property.longitude);
      if (!plat || !plng) return;

      const t = normalizeType(property.typeProperty || property.type || property.category);
      const IconCmp = TYPE_ICON_MAP[t] || HomeIcon;

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

      const root = createRoot(iconSpan);
      root.render(<IconCmp size={18} strokeWidth={2} />);

      const marker = new AdvancedMarkerElement({
        map,
        position: { lat: plat, lng: plng },
        title: property.title || property.name || '',
        content: el,
        gmpClickable: true
      });

      marker.addListener('click', () => setSelectedProperty(property));
      markersRef.current.push({ marker, root, el });
    });
  };

  // Recherche
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    const params = new URLSearchParams();
    if (searchText) params.append('query', searchText);
    router.replace(`/search?${params.toString()}`);
    setTimeout(() => setIsSearching(false), 500);
  };

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
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between p-6">
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

          {/* Recherche */}
          <div className="px-6 pb-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1 relative">
                <div className="flex items-center border rounded-full p-2 px-4 bg-gray-100 focus-within:border-[#1FA89B]">
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="p-1 hover:stroke-[#1FA89B] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearching ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1FA89B]"></div>
                    ) : (
                      <Search size={25} className="hover:stroke-[#1FA89B]" />
                    )}
                  </button>
                  <Input
                    type="text"
                    placeholder="Logement, ville, quartier..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="border-none bg-transparent shadow-none focus-visible:ring-0 flex-1 ml-2"
                  />
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Carte */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />

          {/* Panneau détails */}
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
                  <Button
                    variant="outline"
                    className="flex-1 border-[#146B67] text-[#146B67] hover:bg-[#1FA89B] hover:text-white"
                  >
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
