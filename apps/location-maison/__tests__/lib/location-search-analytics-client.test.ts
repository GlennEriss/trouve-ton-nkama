import { trackLocationNoResult } from '@/features/analytics/location/services/location-search-analytics.client'

describe('analytics des localisations sans résultat', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock
  })

  it('envoie le contexte au pipeline de recherche', () => {
    trackLocationNoResult({
      query: 'Toabet inconnu',
      kind: 'district',
      province: 'Estuaire',
      city: 'Libreville',
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [, request] = (global.fetch as jest.Mock).mock.calls[0]
    expect(JSON.parse(request.body)).toMatchObject({
      search: {
        source: 'property_location_form',
        query_text_raw: 'Toabet inconnu',
        query_params: {
          locationKind: 'district',
          province: 'Estuaire',
          city: 'Libreville',
        },
      },
      result: {
        results_count: 0,
        engine: 'official_catalog_google_places',
      },
    })
  })

  it('déduplique la même recherche pendant 24 heures', () => {
    const input = { query: 'Quartier absent', kind: 'district' as const, city: 'Libreville' }
    trackLocationNoResult(input)
    trackLocationNoResult(input)

    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
