'use client'

import { useCallback, useRef } from 'react'
import { googleMapsSingleton } from '@/singleton'
import { createLogger } from '@/lib/logger'

const logger = createLogger('hooks.google-map.places')

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string
const PLACES_BASE = 'https://places.googleapis.com/v1'

export interface PlaceSuggestion {
  placeId: string
  /** Texte principal (ex: nom de la ville / du quartier). */
  mainText: string
  /** Texte secondaire (ex: province, pays). */
  secondaryText: string
  /** Libellé complet affiché dans la liste. */
  label: string
}

export interface ResolvedPlace {
  name: string
  lat: number
  lng: number
  city: string
  province: string
  district: string
}

export type SuggestStatus = 'ok' | 'empty' | 'error'

export interface SuggestResult {
  items: PlaceSuggestion[]
  status: SuggestStatus
}

interface FetchOptions {
  /** Coordonnées pour biaiser la recherche (centre de la province / ville). */
  bias?: { lat: number; lng: number } | null
  /** Rayon du biais en mètres. */
  radius?: number
}

function pickByType(
  components: Array<{ types: string[]; longText?: string; long_name?: string }>,
  ...types: string[]
): string {
  for (const type of types) {
    const found = components.find((c) => c.types.includes(type))
    if (found) return (found.longText || found.long_name || '').trim()
  }
  return ''
}

/**
 * Hook d'accès à Google Places pour la recherche de villes et de quartiers au
 * Gabon, plus le reverse-geocoding de la position GPS.
 *
 * L'autocomplétion et le détail des lieux passent par l'API REST « Places (New) »
 * (CORS supporté), ce qui évite les ambiguïtés de chargement de librairie du SDK
 * JS et l'API legacy dépréciée. Le reverse-geocoding utilise le Geocoder du SDK.
 */
export function useGooglePlaces() {
  // Jeton de session Places : optimise la facturation autocomplete -> détails.
  const sessionTokenRef = useRef<string | null>(null)

  const getSessionToken = useCallback(() => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }
    return sessionTokenRef.current
  }, [])

  /** Récupère des suggestions Places (REST) pour une saisie donnée. */
  const fetchSuggestions = useCallback(
    async (input: string, options: FetchOptions = {}): Promise<SuggestResult> => {
      const trimmed = input.trim()
      if (trimmed.length < 2) return { items: [], status: 'empty' }
      if (!API_KEY) {
        logger.error('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')
        return { items: [], status: 'error' }
      }

      try {
        const body: any = {
          input: trimmed,
          includedRegionCodes: ['ga'],
          languageCode: 'fr',
          sessionToken: getSessionToken(),
        }
        if (options.bias) {
          // Places API (New) impose un rayon de biais <= 50 000 m.
          const radius = Math.min(options.radius ?? 50000, 50000)
          body.locationBias = {
            circle: {
              center: { latitude: options.bias.lat, longitude: options.bias.lng },
              radius,
            },
          }
        }

        const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': API_KEY,
          },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const detail = await res.text()
          logger.error('Places autocomplete HTTP error', { status: res.status, detail })
          return { items: [], status: 'error' }
        }

        const data = await res.json()
        const items: PlaceSuggestion[] = (data.suggestions || [])
          .map((s: any) => s.placePrediction)
          .filter(Boolean)
          .map((p: any) => ({
            placeId: p.placeId,
            mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
            secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
            label: p.text?.text ?? '',
          }))

        return { items, status: items.length ? 'ok' : 'empty' }
      } catch (error) {
        logger.error('fetchSuggestions failed', { error, input: trimmed })
        return { items: [], status: 'error' }
      }
    },
    [getSessionToken],
  )

  /** Résout un placeId en coordonnées + composants d'adresse (REST). */
  const resolvePlace = useCallback(
    async (placeId: string): Promise<ResolvedPlace | null> => {
      if (!API_KEY) return null
      try {
        const token = sessionTokenRef.current
        sessionTokenRef.current = null // ferme la session de facturation
        const url = new URL(`${PLACES_BASE}/places/${placeId}`)
        url.searchParams.set('languageCode', 'fr')
        if (token) url.searchParams.set('sessionToken', token)

        const res = await fetch(url.toString(), {
          headers: {
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': 'displayName,location,addressComponents',
          },
        })

        if (!res.ok) {
          const detail = await res.text()
          logger.error('Place details HTTP error', { status: res.status, detail })
          return null
        }

        const place = await res.json()
        const components = (place.addressComponents || []).map((c: any) => ({
          types: c.types,
          longText: c.longText,
        }))

        return {
          name: place.displayName?.text ?? '',
          lat: place.location?.latitude ?? 0,
          lng: place.location?.longitude ?? 0,
          city: pickByType(components, 'locality', 'administrative_area_level_2', 'administrative_area_level_3'),
          province: pickByType(components, 'administrative_area_level_1'),
          district: pickByType(components, 'sublocality', 'sublocality_level_1', 'neighborhood'),
        }
      } catch (error) {
        logger.error('resolvePlace failed', { error, placeId })
        return null
      }
    },
    [],
  )

  /** Reverse-geocoding d'une position GPS via le Geocoder du SDK (sans CORS). */
  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<(ResolvedPlace & { isGabon: boolean }) | null> => {
      try {
        await googleMapsSingleton.initializeMapsAPI()
        const google = (window as any).google
        const geocoder = new google.maps.Geocoder()
        const { results } = await geocoder.geocode({ location: { lat, lng }, language: 'fr' })
        if (!results?.length) return null

        const merged: Array<{ types: string[]; long_name: string }> = []
        for (const r of results) {
          for (const c of r.address_components || []) merged.push(c)
        }

        const country = pickByType(merged, 'country')
        const district = pickByType(merged, 'sublocality', 'sublocality_level_1', 'neighborhood')
        const city = pickByType(merged, 'locality', 'administrative_area_level_2', 'administrative_area_level_3')

        return {
          name: district || city || results[0].formatted_address,
          lat,
          lng,
          city,
          province: pickByType(merged, 'administrative_area_level_1'),
          district: district || city,
          isGabon: /gabon/i.test(country),
        }
      } catch (error) {
        logger.error('reverseGeocode failed', { error, lat, lng })
        return null
      }
    },
    [],
  )

  return { fetchSuggestions, resolvePlace, reverseGeocode }
}
