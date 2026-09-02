import { buildPublicSearchFilters } from '@/lib/search/search-filter-query'

describe('public search filters', () => {
  it('applique toujours les contraintes de publication', () => {
    expect(buildPublicSearchFilters(new URLSearchParams())).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED"',
    )
  })

  it('combine les facettes multiples et echappe les valeurs Algolia', () => {
    const params = new URLSearchParams({
      city: 'Libreville,Port-Gentil',
      street: 'Akebe "Poteau"\\Nord',
      typeProperty: 'Studio,Maison',
    })

    const filters = buildPublicSearchFilters(params)

    expect(filters).toContain('(city:"Libreville" OR city:"Port-Gentil")')
    expect(filters).toContain('street:"Akebe \\"Poteau\\"\\\\Nord"')
    expect(filters).toContain('(typeProperty:"Studio" OR typeProperty:"Maison")')
  })

  it('normalise les nombres finis positifs', () => {
    const filters = buildPublicSearchFilters(new URLSearchParams({
      minPrice: '040000',
      maxArea: '75.5',
      minNbrRooms: '0',
    }))

    expect(filters).toContain('price >= 40000')
    expect(filters).toContain('area <= 75.5')
    expect(filters).toContain('nbrRooms >= 0')
  })

  it.each(['1 OR state:"DELETED"', '-1', 'Infinity', 'NaN']) (
    'ignore un filtre numerique invalide: %s',
    (value) => {
      const filters = buildPublicSearchFilters(new URLSearchParams({ minPrice: value }))
      expect(filters).not.toContain('price >=')
      expect(filters).not.toContain('DELETED')
    },
  )

  it('traduit les filtres d\'attributs dynamiques attr_<key> vers attributes.<key>', () => {
    const filters = buildPublicSearchFilters(new URLSearchParams({
      attr_taille: 'M,L',
      attr_marque: 'Zara',
    }))

    expect(filters).toContain('(attributes.taille:"M" OR attributes.taille:"L")')
    expect(filters).toContain('attributes.marque:"Zara"')
  })

  it('ignore une cle attr_ invalide sans planter', () => {
    const filters = buildPublicSearchFilters(new URLSearchParams({
      'attr_taille;DROP': 'M',
      'attr_': 'x',
    }))

    expect(filters).toBe('state:"IN_PROGRESS" AND moderationStatus:"APPROVED"')
  })

  it('ignore les filtres immobilier-only quand category est une racine non-immobilier', () => {
    // Bug reel : une URL combinant category=Mode avec des champs immobilier-only laisses
    // (navigation directe, lien partage, historique du navigateur) appliquait un filtre
    // qu'aucune annonce Mode ne peut jamais satisfaire (street:"" toujours pour Mode), zero
    // resultat sans la moindre explication visible puisque les controles correspondants sont
    // caches des que category != Immobilier (voir useIsImmobilierSearchScope).
    const params = new URLSearchParams({
      category: 'Mode',
      province: 'Estuaire',
      city: 'Libreville',
      street: 'Angondjé',
      status: 'FOR_SALE',
      typeProperty: 'Villa',
      minArea: '10',
      maxArea: '50',
      minNbrRooms: '2',
      maxNbrRooms: '4',
      maxPrice: '10000',
    })

    const filters = buildPublicSearchFilters(params)

    expect(filters).not.toContain('province:')
    expect(filters).not.toContain('street:')
    expect(filters).not.toContain('status:')
    expect(filters).not.toContain('typeProperty:')
    expect(filters).not.toContain('area >=')
    expect(filters).not.toContain('area <=')
    expect(filters).not.toContain('nbrRooms >=')
    expect(filters).not.toContain('nbrRooms <=')
    // Génériques : restent appliqués pour Mode.
    expect(filters).toContain('city:"Libreville"')
    expect(filters).toContain('price <= 10000')
    expect(filters).toContain('categoryPath.lvl0:"Mode"')
  })

  it('applique les filtres immobilier-only quand category est vide ou "Immobilier"', () => {
    const withoutCategory = buildPublicSearchFilters(new URLSearchParams({ province: 'Estuaire' }))
    expect(withoutCategory).toContain('province:"Estuaire"')

    const withImmobilier = buildPublicSearchFilters(
      new URLSearchParams({ category: 'Immobilier', province: 'Estuaire', minArea: '10' }),
    )
    expect(withImmobilier).toContain('province:"Estuaire"')
    expect(withImmobilier).toContain('area >= 10')
  })
})
