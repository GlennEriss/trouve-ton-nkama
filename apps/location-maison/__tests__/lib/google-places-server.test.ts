export {};
describe('Google Places serveur', () => {
  const originalApiKey = process.env.GOOGLE_MAPS_API_KEY

  beforeEach(() => {
    jest.resetModules()
    process.env.GOOGLE_MAPS_API_KEY = 'test-google-key'
    global.fetch = jest.fn()
  })

  afterAll(() => {
    process.env.GOOGLE_MAPS_API_KEY = originalApiKey
  })

  it.each([
    ['city', '(cities)'],
    ['district', '(regions)'],
  ] as const)('restreint une recherche %s aux lieux gabonais de type %s', async (kind, googleType) => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [
          {
            placePrediction: {
              placeId: `place-${kind}`,
              structuredFormat: {
                mainText: { text: kind === 'city' ? 'Libreville' : 'Atong-Abè' },
                secondaryText: { text: 'Estuaire, Gabon' },
              },
              text: { text: 'Lieu, Estuaire, Gabon' },
            },
          },
        ],
      }),
    })

    const { googleAutocomplete } = await import('@/lib/places/google-places.server')
    const result = await googleAutocomplete({ input: 'aton', kind })
    const request = (global.fetch as jest.Mock).mock.calls[0]
    const body = JSON.parse(request[1].body)

    expect(body).toMatchObject({
      includedRegionCodes: ['ga'],
      includedPrimaryTypes: [googleType],
      languageCode: 'fr',
      regionCode: 'ga',
    })
    expect(result[0]).toMatchObject({ placeId: `place-${kind}`, secondaryText: 'Estuaire, Gabon' })
  })

  it('retourne le placeId, les coordonnées et les composants structurés', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        displayName: { text: 'Atong-Abè' },
        location: { latitude: 0.401, longitude: 9.47 },
        addressComponents: [
          { longText: 'Atong-Abè', shortText: 'Atong-Abè', types: ['neighborhood'] },
          { longText: 'Libreville', shortText: 'Libreville', types: ['locality'] },
          { longText: 'Estuaire', shortText: 'Estuaire', types: ['administrative_area_level_1'] },
          { longText: 'Gabon', shortText: 'GA', types: ['country'] },
        ],
      }),
    })

    const { googlePlaceDetails } = await import('@/lib/places/google-places.server')

    await expect(googlePlaceDetails('google-atong-abe')).resolves.toEqual({
      placeId: 'google-atong-abe',
      name: 'Atong-Abè',
      lat: 0.401,
      lng: 9.47,
      city: 'Libreville',
      province: 'Estuaire',
      district: 'Atong-Abè',
      countryCode: 'GA',
    })
  })
})
