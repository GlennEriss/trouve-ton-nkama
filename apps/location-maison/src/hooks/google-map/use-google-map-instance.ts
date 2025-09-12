import { googleMapsSingleton } from '@/singleton';
import { useState, useRef } from 'react';

export const useGoogleMapInstance = (lat: number, lng: number) => {
    const [mapReady, setMapReady] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
  
    // Initialisation de la carte
    const initializeMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;
  
      try {
        // Initialise l'API Google Maps via le singleton
        await googleMapsSingleton.initializeMapsAPI();
  
        // Crée la carte via le singleton
        const map = googleMapsSingleton.createMap(mapRef.current, {
          center: { lat, lng },
          zoom: 11,
        });
  
        mapInstanceRef.current = map;
        setMapReady(true);
      } catch (err) {
        console.error('Error during map initialization:', err);
        setMapReady(false);
      }
    };

    return {
        mapReady,
        setMapReady,
        mapRef,
        mapInstanceRef,
        initializeMap,
    }
}