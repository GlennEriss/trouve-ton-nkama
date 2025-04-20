'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

type MapSectionProps = {
  street: string;
  city: string;
  province: string;
  longitude: number;
  latitude: number;
  countryCode: string;
  image?: string;
  additionalInformation?: string;
};

// Import dynamique des composants react-leaflet pour éviter les erreurs SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Définition d'une icône personnalisée pour le marqueur
const defaultIcon = L.icon({
  iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Map_marker.svg',
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
});

export const MapSection: React.FC<MapSectionProps> = ({
  street,
  city,
  province,
  longitude,
  latitude,
  image,
  additionalInformation,
  countryCode,
}) => {
  return (
    <div style={{ height: '400px', width: '100%', zIndex: 1 }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={[latitude, longitude]} icon={defaultIcon}>
          <Popup>
            <div>
              {image && (
                <img
                  src={image}
                  alt={`${street}, ${city}`}
                  style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', marginTop: '8px' }}
                />
              )}
              <p>{street}, {city}, {province}</p>
              <p>{additionalInformation}</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};