import {
  getOSMLocations,
  serializeOSMLocationsData,
} from '@/data/gabon-osm-locations'
import {
  normalizeGabonLocationName,
  searchGabonLocationCatalog,
} from '@/lib/location/gabon-location-catalog'

describe('catalogue canonique des localités du Gabon', () => {
  const catalog = serializeOSMLocationsData(getOSMLocations())

  it('normalise accents, apostrophes et tirets pour la recherche', () => {
    expect(normalizeGabonLocationName('Atong-Abè')).toBe('atong abe')
    expect(normalizeGabonLocationName("  Port–Gentil  ")).toBe('port gentil')
  })

  it('corrige l alias populaire Toabet vers le quartier canonique Atong-Abè', () => {
    const results = searchGabonLocationCatalog(catalog, 'Toabet', {
      kind: 'district',
      province: 'Estuaire',
      city: 'Libreville',
    })

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      mainText: 'Atong-Abè',
      source: 'OFFICIAL_CATALOG',
      place: {
        city: 'Libreville',
        province: 'Estuaire',
        countryCode: 'GA',
      },
    })
    expect(results[0].placeId).toMatch(/^catalog:district:/)
  })

  it('écarte un quartier homonyme situé dans une autre ville', () => {
    const libreville = searchGabonLocationCatalog(catalog, 'Atong', {
      kind: 'district',
      province: 'Estuaire',
      city: 'Libreville',
    })
    const oyem = searchGabonLocationCatalog(catalog, 'Atong', {
      kind: 'district',
      province: 'Woleu-Ntem',
      city: 'Oyem',
    })

    expect(libreville.map((item) => item.mainText)).toContain('Atong-Abè')
    expect(libreville.map((item) => item.mainText)).not.toContain('Atong')
    expect(oyem.map((item) => item.mainText)).toContain('Atong')
  })
})
