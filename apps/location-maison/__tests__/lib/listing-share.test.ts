import { buildListingShareDescription, buildListingShareTitle, getListingLocationLabel } from '@/lib/seo/listing-share'

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

describe('buildListingShareDescription', () => {
  it('laisse une description déjà courte inchangée', () => {
    expect(buildListingShareDescription('Studio meublé au calme.')).toBe('Studio meublé au calme.')
  })

  it('tronque à une coupure de mot propre, jamais en plein milieu d’un mot', () => {
    const description =
      "Idéalement situé au PK13, ce charmant studio offre un cadre de vie pratique et confortable. Le logement dispose d'une chambre séparée, d'une cuisine équipée et d'un accès facile aux transports en commun."

    const result = buildListingShareDescription(description)

    expect(result.length).toBeLessThanOrEqual(156) // 155 + l'ellipse
    expect(result.endsWith('…')).toBe(true)
    expect(result).not.toContain('  ')
    // Ne coupe jamais au milieu d'un mot : le caractère juste avant l'ellipse doit être la fin
    // d'un mot présent tel quel dans la description d'origine.
    const withoutEllipsis = result.slice(0, -1)
    expect(description.startsWith(withoutEllipsis)).toBe(true)
    expect(description[withoutEllipsis.length]).toBe(' ')
  })

  it('retire les espaces superflus avant de mesurer la longueur', () => {
    expect(buildListingShareDescription('   Studio calme.   ')).toBe('Studio calme.')
  })
})
