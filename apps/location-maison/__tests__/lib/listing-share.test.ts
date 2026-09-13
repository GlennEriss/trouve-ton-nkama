import { buildListingShareTitle, getListingLocationLabel } from '@/lib/seo/listing-share'

describe('getListingLocationLabel', () => {
  it('immobilier (pas de zones) : street + city, comportement historique', () => {
    expect(
      getListingLocationLabel({ street: 'Nkembo', city: 'Libreville', province: 'Estuaire', latitude: 0, longitude: 0 }),
    ).toBe('Nkembo, Libreville')
  })

  it('Mode, une seule zone (street vide) : identique au city seul historique', () => {
    expect(
      getListingLocationLabel({ street: '', city: 'Libreville', province: 'Estuaire', latitude: 0, longitude: 0 }),
    ).toBe('Libreville')
  })

  it('Mode, zones multiples : toutes les villes (jusqu\'au max par défaut)', () => {
    expect(
      getListingLocationLabel({
        street: '',
        city: 'Libreville',
        province: 'Estuaire',
        latitude: 0,
        longitude: 0,
        zones: [
          { city: 'Libreville', province: 'Estuaire', latitude: 0, longitude: 0 },
          { city: 'Franceville', province: 'Haut-Ogooué', latitude: 0, longitude: 0 },
        ],
      }),
    ).toBe('Libreville, Franceville')
  })

  it('Mode pré-migration (zones absent) : repli sur city singulier, aucune régression', () => {
    expect(
      getListingLocationLabel({ street: '', city: 'Port-Gentil', province: 'Ogooué-Maritime', latitude: 0, longitude: 0 }),
    ).toBe('Port-Gentil')
  })
})

describe('buildListingShareTitle', () => {
  it('compose titre — prix · localisation, avec plusieurs zones', () => {
    const title = buildListingShareTitle({
      title: 'Robe wax',
      price: 15000,
      street: '',
      city: 'Libreville',
      province: 'Estuaire',
      latitude: 0,
      longitude: 0,
      zones: [
        { city: 'Libreville', province: 'Estuaire', latitude: 0, longitude: 0 },
        { city: 'Franceville', province: 'Haut-Ogooué', latitude: 0, longitude: 0 },
      ],
    })
    expect(title).toBe(`Robe wax — FCFA ${(15000).toLocaleString('fr-FR')} · Libreville, Franceville`)
  })
})
