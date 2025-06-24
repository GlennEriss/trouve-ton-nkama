'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.fullscreen/Control.FullScreen.css';
import L from 'leaflet';
import 'leaflet.fullscreen';

// @ts-ignore
const fullscreenControl = L.control.fullscreen;

interface SimpleMapProps {
  street: string;
  city: string;
  province: string;
  longitude: number;
  latitude: number;
  countryCode: string;
  image?: string;
  additionalInfo?: string;
}

const SimpleMap: React.FC<SimpleMapProps> = ({
  street,
  city,
  province,
  longitude,
  latitude,
  countryCode,
  image,
  additionalInfo,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Nettoyer la carte existante
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Créer une nouvelle carte
    const map = L.map(mapContainerRef.current).setView([latitude, longitude], 13);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Ajouter le contrôle de plein écran
    fullscreenControl({
      position: 'topleft',
      title: {
        'false': 'Voir en plein écran',
        'true': 'Quitter le plein écran'
      }
    }).addTo(map);

    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const marker = L.marker([latitude, longitude], { icon: defaultIcon }).addTo(map);
    marker.bindPopup(`
      <div>
        <h3>${street}</h3>
        <p>${city}, ${province}</p>
        ${additionalInfo ? `<p>${additionalInfo}</p>` : ''}
      </div>
    `);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, street, city, province, additionalInfo]);

  return (
    <div 
      ref={mapContainerRef} 
      style={{ height: '400px', width: '100%' }}
    />
  );
};

export default SimpleMap; 