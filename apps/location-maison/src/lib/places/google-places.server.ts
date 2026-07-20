import { AppError } from '@/lib/errors/app-error'

/**
 * Accès serveur à l'API « Places (New) » de Google.
 * Centralise les appels (autocomplete + détails) pour le proxy mis en cache,
 * afin de ne pas exposer d'appels directs côté client et de mutualiser le cache.
 */

const API_KEY =
  process.env.GOOGLE_MAPS_API_KEY ?? (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string)
const PLACES_BASE = 'https://places.googleapis.com/v1'

export interface PlaceSuggestionDTO {
  placeId: string
  mainText: string
  secondaryText: string
  label: string
}

export interface ResolvedPlaceDTO {
  placeId: string
  name: string
  lat: number
  lng: number
  city: string
  province: string
  district: string
  countryCode: string
}

export interface AutocompleteParams {
  input: string
  kind: 'city' | 'district'
  bias?: { lat: number; lng: number } | null
  radius?: number
  sessionToken?: string
}

function pickByType(
  components: Array<{ types: string[]; longText?: string }>,
  ...types: string[]
): string {
  for (const type of types) {
    const found = components.find((c) => c.types.includes(type))
    if (found) return (found.longText || '').trim()
  }
  return ''
}

function pickShortByType(
  components: Array<{ types: string[]; shortText?: string }>,
  type: string,
): string {
  const found = components.find((component) => component.types.includes(type))
  return (found?.shortText || '').trim().toUpperCase()
}

function assertKey() {
  if (!API_KEY) {
    throw new AppError('Clé Google Maps absente côté serveur', {
      code: 'GOOGLE_MAPS_KEY_MISSING',
      status: 500,
    })
  }
}

export async function googleAutocomplete(
  params: AutocompleteParams,
): Promise<PlaceSuggestionDTO[]> {
  assertKey()
  const body: Record<string, unknown> = {
    input: params.input,
    includedRegionCodes: ['ga'],
    includedPrimaryTypes: [params.kind === 'city' ? '(cities)' : '(regions)'],
    languageCode: 'fr',
    regionCode: 'ga',
  }
  if (params.sessionToken) body.sessionToken = params.sessionToken
  if (params.bias) {
    body.locationBias = {
      circle: {
        center: { latitude: params.bias.lat, longitude: params.bias.lng },
        radius: Math.min(params.radius ?? 50000, 50000),
      },
    }
  }

  const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': API_KEY },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new AppError(`Places autocomplete upstream error (${res.status})`, {
      code: 'PLACES_AUTOCOMPLETE_UPSTREAM_ERROR',
      status: 502,
      details: { status: res.status, detail },
    })
  }

  const data = await res.json()
  return (data.suggestions || [])
    .map((s: any) => s.placePrediction)
    .filter(Boolean)
    .map((p: any) => ({
      placeId: p.placeId,
      mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
      label: p.text?.text ?? '',
    }))
}

export async function googlePlaceDetails(
  placeId: string,
  sessionToken?: string,
): Promise<ResolvedPlaceDTO | null> {
  assertKey()
  const url = new URL(`${PLACES_BASE}/places/${placeId}`)
  url.searchParams.set('languageCode', 'fr')
  if (sessionToken) url.searchParams.set('sessionToken', sessionToken)

  const res = await fetch(url.toString(), {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'displayName,location,addressComponents',
    },
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new AppError(`Place details upstream error (${res.status})`, {
      code: 'PLACE_DETAILS_UPSTREAM_ERROR',
      status: 502,
      details: { status: res.status, detail },
    })
  }

  const place = await res.json()
  const components = (place.addressComponents || []).map((c: any) => ({
    types: c.types,
    longText: c.longText,
    shortText: c.shortText,
  }))

  return {
    placeId,
    name: place.displayName?.text ?? '',
    lat: place.location?.latitude ?? 0,
    lng: place.location?.longitude ?? 0,
    city: pickByType(components, 'locality', 'administrative_area_level_2', 'administrative_area_level_3'),
    province: pickByType(components, 'administrative_area_level_1'),
    district: pickByType(components, 'sublocality', 'sublocality_level_1', 'neighborhood'),
    countryCode: pickShortByType(components, 'country'),
  }
}
