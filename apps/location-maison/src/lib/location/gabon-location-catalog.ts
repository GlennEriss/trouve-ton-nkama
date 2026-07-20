import type { OSMLocation, OSMLocationsSerializable } from '@/data/gabon-osm-locations'

export type LocationKind = 'city' | 'district'

export type CatalogLocationSuggestion = {
  placeId: string
  mainText: string
  secondaryText: string
  label: string
  source: 'OFFICIAL_CATALOG'
  place: {
    placeId: string
    name: string
    lat: number
    lng: number
    city: string
    province: string
    district: string
    countryCode: 'GA'
  }
}

type CanonicalOverride = {
  name: string
  aliases: string[]
}

// Les alias métier complètent le catalogue administré lorsque l'usage local
// diffère trop du nom officiel pour qu'une recherche floue soit fiable.
const CANONICAL_OVERRIDES: Record<string, CanonicalOverride> = {
  'atong abe': {
    name: 'Atong-Abè',
    aliases: ['atong abe', 'atong-abe', 'atongabè', 'toabe', 'toabet'],
  },
}

export function normalizeGabonLocationName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s’'`´-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function canonicalize(name: string) {
  const normalized = normalizeGabonLocationName(name)
  const override = CANONICAL_OVERRIDES[normalized]
  return {
    name: override?.name ?? name.trim(),
    aliases: override?.aliases ?? [],
  }
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      )
    }
    previous.splice(0, previous.length, ...current)
  }
  return previous[right.length]
}

function matchScore(query: string, names: string[]) {
  let best = Number.POSITIVE_INFINITY
  for (const candidate of names.map(normalizeGabonLocationName).filter(Boolean)) {
    if (candidate === query) best = Math.min(best, 0)
    else if (candidate.startsWith(query)) best = Math.min(best, 1)
    else if (candidate.includes(query)) best = Math.min(best, 2)
    else if (query.length >= 4) {
      const distance = editDistance(query, candidate)
      const allowedDistance = query.length >= 8 ? 2 : 1
      if (distance <= allowedDistance) best = Math.min(best, 3 + distance)
    }
  }
  return best
}

function sameLocation(left: string | undefined, right: string | undefined) {
  if (!right) return true
  if (!left) return false
  return normalizeGabonLocationName(left) === normalizeGabonLocationName(right)
}

function buildSuggestion(
  location: OSMLocation,
  kind: LocationKind,
  city: string,
  province: string,
): CatalogLocationSuggestion {
  const canonical = canonicalize(location.name)
  const placeId = `catalog:${kind}:${location.osmType}:${location.osmId}`
  const secondaryText = [city, province, 'Gabon'].filter(Boolean).join(', ')
  return {
    placeId,
    mainText: canonical.name,
    secondaryText,
    label: `${canonical.name}${secondaryText ? `, ${secondaryText}` : ''}`,
    source: 'OFFICIAL_CATALOG',
    place: {
      placeId,
      name: canonical.name,
      lat: location.lat,
      lng: location.lon,
      city: kind === 'city' ? canonical.name : city,
      province,
      district: kind === 'district' ? canonical.name : '',
      countryCode: 'GA',
    },
  }
}

export function searchGabonLocationCatalog(
  catalog: OSMLocationsSerializable,
  queryText: string,
  options: { kind: LocationKind; province?: string; city?: string; limit?: number },
) {
  const query = normalizeGabonLocationName(queryText)
  if (query.length < 2) return []

  const locations = options.kind === 'city' ? catalog.cities : catalog.quarters
  const scored = locations.flatMap((location) => {
    const city =
      options.kind === 'city' ? location.name : catalog.quarterToCity[location.name] ?? ''
    const province =
      options.kind === 'city'
        ? catalog.cityToProvince[location.name] ?? ''
        : catalog.quarterToProvince[location.name] ?? ''

    if (!sameLocation(province, options.province)) return []
    if (options.kind === 'district' && !sameLocation(city, options.city)) return []

    const canonical = canonicalize(location.name)
    const score = matchScore(query, [
      location.name,
      canonical.name,
      ...(location.aliases ?? []),
      ...canonical.aliases,
    ])
    if (!Number.isFinite(score)) return []
    return [{ location, city, province, score }]
  })

  const deduplicated = new Map<string, ReturnType<typeof buildSuggestion>>()
  for (const item of scored.sort(
    (left, right) => left.score - right.score || left.location.name.localeCompare(right.location.name, 'fr'),
  )) {
    const suggestion = buildSuggestion(item.location, options.kind, item.city, item.province)
    const key = [
      normalizeGabonLocationName(suggestion.mainText),
      normalizeGabonLocationName(suggestion.place.city),
      normalizeGabonLocationName(suggestion.place.province),
    ].join('|')
    if (!deduplicated.has(key)) deduplicated.set(key, suggestion)
  }

  return Array.from(deduplicated.values()).slice(0, options.limit ?? 5)
}
