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
})
