'use client'

import { useCallback, useEffect, useRef } from 'react'
import { googleMapsSingleton } from '@/singleton'
import { createLogger } from '@/lib/logger'
import type { OSMLocationsSerializable } from '@/data/gabon-osm-locations'
import {
  searchGabonLocationCatalog,
  type LocationKind,
} from '@/lib/location/gabon-location-catalog'

const logger = createLogger('hooks.google-map.places')

/**
 * Cache mémoire L1 (durée de vie = la session navigateur), au-dessus du cache
 * partagé L2 (Redis, via le proxy /api/places). Évite même l'aller-retour
 * réseau vers notre propre proxy pour les requêtes redondantes (backspace,
 * re-frappe, re-sélection).
 */
const SUGGEST_TTL_MS = 5 * 60 * 1000
const suggestCache = new Map<string, { ts: number; items: PlaceSuggestion[] }>()
const detailsCache = new Map<string, ResolvedPlace>()
let catalogPromise: Promise<OSMLocationsSerializable | null> | null = null

async function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch('/api/location/osm/gabon')
      .then(async (response) => {
        if (!response.ok) return null
        const payload = await response.json()
        return (payload.data ?? null) as OSMLocationsSerializable | null
      })
      .catch((error) => {
        logger.warn('Official location catalog unavailable', { error })
        catalogPromise = null
        return null
      })
  }
  return catalogPromise
}

function biasKey(bias?: { lat: number; lng: number } | null): string {
  if (!bias) return 'none'
  // Arrondi pour regrouper les biais proches sur une même clé de cache.
  return `${bias.lat.toFixed(2)},${bias.lng.toFixed(2)}`
}

export interface PlaceSuggestion {
  placeId: string
  /** Texte principal (ex: nom de la ville / du quartier). */
  mainText: string
  /** Texte secondaire (ex: province, pays). */
  secondaryText: string
  /** Libellé complet affiché dans la liste. */
  label: string
  source: 'GOOGLE_PLACES' | 'OFFICIAL_CATALOG'
  /** Le catalogue officiel fournit déjà ses coordonnées. */
  place?: ResolvedPlace
}

export interface ResolvedPlace {
  placeId: string
  name: string
  lat: number
  lng: number
  city: string
  province: string
  district: string
  countryCode: string
}

export type SuggestStatus = 'ok' | 'empty' | 'error'

export interface SuggestResult {
  items: PlaceSuggestion[]
  status: SuggestStatus
}

interface FetchOptions {
  kind: LocationKind
  /** Coordonnées pour biaiser la recherche (centre de la province / ville). */
  bias?: { lat: number; lng: number } | null
  /** Rayon du biais en mètres. */
  radius?: number
  province?: string
  city?: string
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

  // L'étape de localisation arrive après les informations générales du bien.
  // Démarrer ce chargement à son montage masque la latence avant la première frappe.
  useEffect(() => {
    void loadCatalog()
  }, [])

  const getSessionToken = useCallback(() => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }
    return sessionTokenRef.current
  }, [])

  /** Récupère des suggestions via le proxy /api/places/autocomplete (cache Redis). */
  const fetchSuggestions = useCallback(
    async (input: string, options: FetchOptions): Promise<SuggestResult> => {
      const trimmed = input.trim()
      if (trimmed.length < 2) return { items: [], status: 'empty' }

      // Cache L1 mémoire : évite l'aller-retour réseau pour une requête récente.
      const cacheKey = [
        options.kind,
        trimmed.toLowerCase(),
        options.province ?? '',
        options.city ?? '',
        biasKey(options.bias),
      ].join('|')
      const cached = suggestCache.get(cacheKey)
      if (cached && Date.now() - cached.ts < SUGGEST_TTL_MS) {
        return { items: cached.items, status: cached.items.length ? 'ok' : 'empty' }
      }

      try {
        const [catalog, googleResponse] = await Promise.all([
          loadCatalog(),
          fetch('/api/places/autocomplete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: trimmed,
              kind: options.kind,
              bias: options.bias ?? null,
              sessionToken: getSessionToken(),
            }),
          }).catch((error) => {
            logger.warn('Google autocomplete unavailable', { error })
            return null
          }),
        ])

        const officialItems = catalog
          ? searchGabonLocationCatalog(catalog, trimmed, {
              kind: options.kind,
              province: options.province,
              city: options.city,
            })
          : []
        for (const item of officialItems) detailsCache.set(item.placeId, item.place)

        let googleItems: PlaceSuggestion[] = []
        if (googleResponse?.ok) {
          const data = await googleResponse.json()
          googleItems = (data.items ?? []).map((item: PlaceSuggestion) => ({
            ...item,
            source: 'GOOGLE_PLACES' as const,
          }))
        } else if (googleResponse) {
          logger.warn('autocomplete proxy error', { status: googleResponse.status })
        }

        const officialNames = new Set(officialItems.map((item) => item.mainText.toLocaleLowerCase('fr')))
        const items = [
          ...officialItems,
          ...googleItems.filter((item) => !officialNames.has(item.mainText.toLocaleLowerCase('fr'))),
        ].slice(0, 8)
        suggestCache.set(cacheKey, { ts: Date.now(), items })
        if (items.length) return { items, status: 'ok' }
        return { items, status: googleResponse === null && catalog === null ? 'error' : 'empty' }
      } catch (error) {
        logger.error('fetchSuggestions failed', { error, input: trimmed })
        return { items: [], status: 'error' }
      }
    },
    [getSessionToken],
  )

  /** Résout un placeId via le proxy /api/places/details (cache Redis). */
  const resolvePlace = useCallback(
    async (placeId: string): Promise<ResolvedPlace | null> => {
      // Cache L1 par placeId (détails stables → autorisé par les ToS).
      const cachedDetails = detailsCache.get(placeId)
      if (cachedDetails) {
        sessionTokenRef.current = null
        return cachedDetails
      }

      try {
        const token = sessionTokenRef.current
        sessionTokenRef.current = null // ferme la session de facturation
        const params = new URLSearchParams({ placeId })
        if (token) params.set('sessionToken', token)

        const res = await fetch(`/api/places/details?${params.toString()}`)
        if (!res.ok) {
          logger.error('details proxy error', { status: res.status, placeId })
          return null
        }

        const data = await res.json()
        const resolved: ResolvedPlace | null = data.place ?? null
        if (resolved) detailsCache.set(placeId, resolved)
        return resolved
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
          placeId: results[0].place_id || `gps:${lat},${lng}`,
          name: district || city || results[0].formatted_address,
          lat,
          lng,
          city,
          province: pickByType(merged, 'administrative_area_level_1'),
          district: district || city,
          countryCode: /gabon/i.test(country) ? 'GA' : '',
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
