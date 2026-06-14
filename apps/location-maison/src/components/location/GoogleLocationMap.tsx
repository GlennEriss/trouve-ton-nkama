'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { googleMapsSingleton } from '@/singleton'
import { GABON_CENTER } from '@/constantes/gabon-locations'
import { createLogger } from '@/lib/logger'

const logger = createLogger('components.location.google-map')

interface GoogleLocationMapProps {
  coordinates: { lat: number; lng: number } | null
  /** Nom affiché dans l'infobulle du marqueur. */
  label?: string
  /** Zoom appliqué lorsqu'une position précise est fournie. */
  zoom?: number
}

export default function GoogleLocationMap({ coordinates, label, zoom = 15 }: GoogleLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  // Initialisation unique de la carte.
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      if (!mapRef.current || mapInstanceRef.current) return
      try {
        await googleMapsSingleton.initializeMapsAPI()
        if (cancelled || !mapRef.current) return

        const center = coordinates ?? GABON_CENTER
        const map = googleMapsSingleton.createMap(mapRef.current, {
          center,
          zoom: coordinates ? zoom : 6,
        })
        mapInstanceRef.current = map
        setReady(true)
      } catch (err) {
        logger.error('Google map init failed', { err })
        if (!cancelled) setError(true)
      }
    }

    init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mise à jour du marqueur et recentrage quand les coordonnées changent.
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !ready) return

    const google = (window as any).google
    if (!google?.maps) return

    if (markerRef.current) {
      markerRef.current.map = null
      markerRef.current = null
    }

    if (coordinates) {
      const AdvancedMarkerElement = googleMapsSingleton.getAdvancedMarkerElement()
      markerRef.current = new AdvancedMarkerElement({
        map,
        position: coordinates,
        title: label || 'Localisation du bien',
      })
      map.setCenter(coordinates)
      map.setZoom(zoom)
    }
  }, [coordinates, label, ready, zoom])

  if (error) {
    return (
      <div className="w-full h-56 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center px-4 text-center">
        <p className="text-red-700 text-sm">
          La carte Google n&apos;a pas pu être chargée. La localisation reste enregistrée.
        </p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-56 rounded-lg overflow-hidden shadow-lg">
      {!ready && (
        <div className="absolute inset-0 z-10 bg-gray-100 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: '224px' }} />
    </div>
  )
}
