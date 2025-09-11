'use client'

import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface LocationMapProps {
  coordinates: [number, number] | null
  districtName?: string
}

// Coordonnées par défaut de Libreville, Gabon (latitude, longitude)
const DEFAULT_COORDINATES: [number, number] = [0.4162, 9.4545]

// Styles pour les icônes Leaflet
const createCustomIcon = (color: string = '#CBB171') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })
}

export default function LocationMap({ coordinates, districtName }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  // Initialiser la carte une seule fois
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: coordinates || DEFAULT_COORDINATES,
      zoom: coordinates ? 14 : 12,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    })

    // Ajouter le fond de carte OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    mapInstanceRef.current = map

    // Nettoyer la carte lors du démontage
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
      }
    }
  }, []) // Seulement au montage

  // Mettre à jour le marqueur et la vue quand les coordonnées changent
  useEffect(() => {
    if (!mapInstanceRef.current) return

    const map = mapInstanceRef.current

    // Supprimer l'ancien marqueur s'il existe
    if (markerRef.current) {
      map.removeLayer(markerRef.current)
      markerRef.current = null
    }

    // Ajouter un nouveau marqueur si des coordonnées sont fournies
    if (coordinates) {
      // Convertir les coordonnées de [longitude, latitude] vers [latitude, longitude] pour Leaflet
      const leafletCoordinates: [number, number] = [coordinates[1], coordinates[0]]
      
      const marker = L.marker(leafletCoordinates, {
        icon: createCustomIcon('#CBB171')
      }).addTo(map)

      markerRef.current = marker

      // Centrer la carte sur les nouvelles coordonnées avec animation
      map.setView(leafletCoordinates, 14, {
        animate: true,
        duration: 0.5
      })

      // Ajouter un popup avec les coordonnées et le nom du quartier
      const popupContent = districtName 
        ? `
          <div style="text-align: center; font-family: sans-serif;">
            <strong>${districtName}</strong><br>
            <small>Lat: ${leafletCoordinates[0].toFixed(4)}, Lng: ${leafletCoordinates[1].toFixed(4)}</small>
          </div>
        `
        : `
          <div style="text-align: center; font-family: sans-serif;">
            <strong>Localisation sélectionnée</strong><br>
            <small>Lat: ${leafletCoordinates[0].toFixed(4)}, Lng: ${leafletCoordinates[1].toFixed(4)}</small>
          </div>
        `
     
     marker.bindPopup(popupContent)
   } else {
     // Si pas de coordonnées, centrer sur Libreville
     map.setView(DEFAULT_COORDINATES, 12, {
       animate: true,
       duration: 0.5
     })
   }
  }, [coordinates, districtName])

  return (
    <div 
      ref={mapRef} 
      className="w-full h-48 rounded-lg overflow-hidden shadow-lg"
      style={{ minHeight: '192px' }}
    />
  )
}
