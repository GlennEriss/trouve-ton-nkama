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

  return <SimpleMap {...props} />;
};