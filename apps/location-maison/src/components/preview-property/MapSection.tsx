'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const SimpleMap = dynamic(
  () => import('./SimpleMap'),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: '400px', width: '100%', backgroundColor: '#f0f0f0' }} />
    ),
  }
);

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

export const MapSection: React.FC<MapSectionProps> = (props) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return <div style={{ height: '400px', width: '100%', backgroundColor: '#f0f0f0' }} />;
  }

  // `Property.latitude`/`longitude` sont typés `number` (non optionnels), mais certaines
  // annonces existantes en base ne les ont pas — `L.marker([undefined, undefined])` fait
  // planter tout SimpleMap ("Invalid LatLng object"), constaté en e2e réel. Repli propre
  // plutôt qu'un crash React sur toute la page.
  if (!Number.isFinite(props.latitude) || !Number.isFinite(props.longitude)) {
    return (
      <div
        style={{ height: '400px', width: '100%' }}
        className="flex items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400"
      >
        Localisation non disponible sur la carte
      </div>
    );
  }

  return <div className="relative z-0"><SimpleMap {...props} /></div>;
};