'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapProvider } from '@/providers/MapProvider';
import { MapCacheProvider } from '@/providers/MapCacheProvider';
import MapSidebar from './MapSidebar';
import { useQuarterProperties } from '@/hooks/useQuarterProperties';
import { useMapContext } from '@/providers/MapProvider';

// Import dynamique de LeafletMap pour éviter les erreurs SSR
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-gray-500">Chargement de la carte...</div>
    </div>
  ),
});

// Composant interne qui utilise les contexts
function MapContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { properties } = useQuarterProperties();

  return (
    <div className="w-full flex relative" style={{ height: 'calc(100vh - 100px)' }}>
      {/* Sidebar */}
      <MapSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Carte */}
      <div className="flex-1 relative" style={{ height: '100%', minHeight: '500px' }}>
        <LeafletMap properties={properties} />
      </div>
    </div>
  );
}

// Composant principal avec providers
export default function InteractiveMapPage() {
  return (
    <MapProvider>
      <MapCacheProvider>
        <MapContent />
      </MapCacheProvider>
    </MapProvider>
  );
}
