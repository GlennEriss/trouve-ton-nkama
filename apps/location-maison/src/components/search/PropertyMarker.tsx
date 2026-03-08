'use client';

import { useRef, useEffect } from 'react';
import { createLogger } from '@/lib/logger';

const logger = createLogger('components.property-marker');

type Property = {
  id: string;
  title?: string;
  name?: string;
  latitude: number;
  longitude: number;
  price?: number;
  typeProperty?: string;
  type?: string;
  category?: string;
};

type PropertyMarkerProps = {
  property: Property;
  map: any;
  AdvancedMarkerElement: any;
  onPropertyClick: (property: Property) => void;
};

const TYPE_ICON_MAP: Record<string, string> = {
  home: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
  villa: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
  logement: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
  property: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
  apartment: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2"/></svg>`,
  building: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2"/></svg>`,
  studio: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  room: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  shop: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
  kiosk: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
  desk: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h10"/><path d="M7 11h10"/><path d="M7 15h4"/></svg>`,
  land: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>`
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

function shortPrice(p?: number) {
  if (!p || p <= 0) return '—';
  if (p >= 1_000_000) {
    const v = p / 1_000_000;
    return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (p >= 1_000) return `${Math.round(p / 1000)}K`;
  return `${p}`;
}

function PropertyMarker({ 
  property, 
  map, 
  AdvancedMarkerElement, 
  onPropertyClick 
}: PropertyMarkerProps) {
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!AdvancedMarkerElement || !map) return;

    const plat = Number(property.latitude);
    const plng = Number(property.longitude);
    if (!plat || !plng) return;

    const t = normalizeType(property.typeProperty || property.type || property.category);
    const iconSvg = TYPE_ICON_MAP[t] || TYPE_ICON_MAP.home;

    // Créer l'élément DOM du marker
    const el = document.createElement('div');
    el.className = 'lg-marker';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');

    // Créer l'icône SVG directement (sans React)
    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon';
    iconSpan.innerHTML = iconSvg;
    el.appendChild(iconSpan);

    const priceSpan = document.createElement('span');
    priceSpan.className = 'price';
    priceSpan.textContent = shortPrice(property.price);
    el.appendChild(priceSpan);

    const unitSpan = document.createElement('span');
    unitSpan.className = 'unit';
    unitSpan.textContent = property.price ? 'FCFA' : '';
    el.appendChild(unitSpan);

    // Créer le marker Google Maps
    const marker = new AdvancedMarkerElement({
      map,
      position: { lat: plat, lng: plng },
      title: property.title || property.name || '',
      content: el,
      gmpClickable: true
    });

    // Ajouter l'événement de clic
    marker.addListener('click', () => onPropertyClick(property));
    markerRef.current = marker;

    // Nettoyage
    return () => {
      try {
        if (markerRef.current) {
          markerRef.current.map = null;
          markerRef.current = null;
        }
      } catch (error) {
        logger.warn('Error cleaning up marker', { error, propertyId: property.id });
      }
    };
  }, [property, map, AdvancedMarkerElement, onPropertyClick]);

  return null; // Ce composant ne rend rien directement
}

export default PropertyMarker;

// Styles CSS pour les markers - injectés une seule fois
if (typeof document !== 'undefined' && !document.getElementById('lg-marker-styles')) {
  const style = document.createElement('style');
  style.id = 'lg-marker-styles';
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
}
