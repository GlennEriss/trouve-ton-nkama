import {
  buildZonesPatch,
  denormalizeZonesForSearch,
  formatZonesLabel,
  getListingZones,
  normalizeCityNames,
  MAX_LISTING_ZONES,
} from '@/lib/listing-zones'

describe('getListingZones', () => {
  it('retourne zones telles quelles quand présentes', () => {
    const zones = [{ city: 'Libreville', province: 'Estuaire', latitude: 1, longitude: 2 }]
    expect(getListingZones({ zones, city: 'Ignoré', province: '', latitude: 0, longitude: 0 })).toBe(zones)
  })

  it('replie sur city/province singuliers quand zones absent (annonce pré-migration)', () => {
    const result = getListingZones({ city: 'Libreville', province: 'Estuaire', latitude: 1, longitude: 2 })
    expect(result).toEqual([{ city: 'Libreville', province: 'Estuaire', latitude: 1, longitude: 2 }])
  })

  it('retourne un tableau vide sans city ni zones', () => {
    expect(getListingZones({ city: '', province: '', latitude: 0, longitude: 0 })).toEqual([])
  })

  it('ignore un tableau zones vide et replie sur city', () => {
    expect(getListingZones({ zones: [], city: 'Franceville', province: 'Haut-Ogooué', latitude: 0, longitude: 0 }))
      .toEqual([{ city: 'Franceville', province: 'Haut-Ogooué', latitude: 0, longitude: 0 }])
  })
})

describe('normalizeCityNames', () => {
  it('dédoublonne insensible à la casse/espaces en préservant le premier ordre', () => {
    expect(normalizeCityNames(['Libreville', ' libreville ', 'LIBREVILLE', 'Franceville']))
      .toEqual(['Libreville', 'Franceville'])
  })

  it('filtre les entrées vides', () => {
    expect(normalizeCityNames(['', '   ', 'Oyem'])).toEqual(['Oyem'])
  })

  it('plafonne au max fourni', () => {
    expect(normalizeCityNames(['A', 'B', 'C', 'D'], 2)).toEqual(['A', 'B'])
  })

  it('respecte MAX_LISTING_ZONES par défaut', () => {
    const many = Array.from({ length: 10 }, (_, i) => `Ville${i}`)
    expect(normalizeCityNames(many)).toHaveLength(MAX_LISTING_ZONES)
  })
})

describe('formatZonesLabel', () => {
  const z = (city: string) => ({ city, province: '', latitude: 0, longitude: 0 })

  it('une seule zone', () => {
    expect(formatZonesLabel([z('Libreville')])).toBe('Libreville')
  })

  it('deux zones (sous le seuil par défaut)', () => {
    expect(formatZonesLabel([z('Libreville'), z('Franceville')])).toBe('Libreville, Franceville')
  })

  it('tronque au-delà du max avec un suffixe +N', () => {
    expect(formatZonesLabel([z('Libreville'), z('Franceville'), z('Oyem')], { max: 2 }))
      .toBe('Libreville, Franceville +1')
  })

  it('tableau vide -> chaîne vide', () => {
    expect(formatZonesLabel([])).toBe('')
  })
})

describe('denormalizeZonesForSearch', () => {
  it('produit des tableaux plats dédupliqués pour Algolia', () => {
    const zones = [
      { city: 'Libreville', province: 'Estuaire', latitude: 0, longitude: 0 },
      { city: 'Owendo', province: 'Estuaire', latitude: 0, longitude: 0 },
      { city: 'Franceville', province: 'Haut-Ogooué', latitude: 0, longitude: 0 },
    ]
    expect(denormalizeZonesForSearch(zones)).toEqual({
      cities: ['Libreville', 'Owendo', 'Franceville'],
      provinces: ['Estuaire', 'Haut-Ogooué'],
    })
  })
})

describe('buildZonesPatch', () => {
  it('dérive city/province/lat/lng de la zone primaire + cities/provinces', () => {
    const zones = [
      { city: 'Libreville', province: 'Estuaire', latitude: 0.39, longitude: 9.45 },
      { city: 'Franceville', province: 'Haut-Ogooué', latitude: -1.63, longitude: 13.58 },
    ]
    expect(buildZonesPatch(zones)).toEqual({
      zones,
      city: 'Libreville',
      province: 'Estuaire',
      latitude: 0.39,
      longitude: 9.45,
      cities: ['Libreville', 'Franceville'],
      provinces: ['Estuaire', 'Haut-Ogooué'],
    })
  })

  it('zones vide -> champs par défaut sûrs (pas de crash)', () => {
    expect(buildZonesPatch([])).toEqual({
      zones: [],
      city: '',
      province: '',
      latitude: 0,
      longitude: 0,
      cities: [],
      provinces: [],
    })
  })
})
