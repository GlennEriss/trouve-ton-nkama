import { extractLocationFields, shouldCreateStreet, shouldSyncLocation } from '../../src/location/location-sync.policy'

const VALID = {
  province: 'Estuaire',
  city: 'Libreville',
  street: 'Glass',
  country: 'Gabon',
  countryCode: 'GA',
  provinceLon: 9.45,
  provinceLat: 0.39,
  cityLon: 9.45,
  cityLat: 0.39,
  streetLon: 9.46,
  streetLat: 0.4,
}

describe('extractLocationFields', () => {
  it('extrait une localisation immobilière complète', () => {
    expect(extractLocationFields(VALID)).toEqual(VALID)
  })

  it('retombe sur Gabon/GA uniquement quand absents du document', () => {
    const { country, countryCode, ...rest } = VALID
    expect(extractLocationFields(rest)).toMatchObject({ country: 'Gabon', countryCode: 'GA' })
  })

  it('ne remplace jamais un country/countryCode déjà présent', () => {
    expect(extractLocationFields({ ...VALID, country: 'Togo', countryCode: 'TG' })).toMatchObject({
      country: 'Togo',
      countryCode: 'TG',
    })
  })

  it('retourne null sans province', () => {
    const { province, ...rest } = VALID
    expect(extractLocationFields(rest)).toBeNull()
  })

  it('retourne null sans ville', () => {
    const { city, ...rest } = VALID
    expect(extractLocationFields(rest)).toBeNull()
  })

  it('retourne null pour un document undefined', () => {
    expect(extractLocationFields(undefined)).toBeNull()
    expect(extractLocationFields(null)).toBeNull()
  })

  it('retourne null pour une annonce à zones multiples (Mode) même avec city/province présents', () => {
    expect(extractLocationFields({ ...VALID, cities: ['Libreville', 'Franceville'] })).toBeNull()
    expect(extractLocationFields({ ...VALID, zones: [{ city: 'Libreville' }] })).toBeNull()
  })

  it('accepte une rue vide (immobilier sans rue renseignée)', () => {
    expect(extractLocationFields({ ...VALID, street: '' })?.street).toBe('')
  })

  it('normalise les espaces superflus sans changer le libellé métier', () => {
    expect(extractLocationFields({ ...VALID, city: '  Libreville  ' })?.city).toBe('Libreville')
  })

  it('ignore les coordonnées non numériques', () => {
    expect(extractLocationFields({ ...VALID, cityLon: 'nope' })?.cityLon).toBeUndefined()
  })
})

describe('shouldCreateStreet', () => {
  it('vrai quand une rue est renseignée', () => {
    expect(shouldCreateStreet(extractLocationFields(VALID)!)).toBe(true)
  })
  it('faux quand la rue est vide', () => {
    expect(shouldCreateStreet(extractLocationFields({ ...VALID, street: '' })!)).toBe(false)
  })
})

describe('shouldSyncLocation', () => {
  it('synchronise à la création d\'une annonce immobilière valide', () => {
    expect(shouldSyncLocation(undefined, VALID)).toBe(true)
  })

  it('ignore une suppression', () => {
    expect(shouldSyncLocation(VALID, undefined)).toBe(false)
  })

  it('ignore une modification de prix ou description', () => {
    expect(shouldSyncLocation(VALID, { ...VALID, price: 999999, description: 'nouvelle description' })).toBe(false)
  })

  it('synchronise lorsque la ville change', () => {
    expect(shouldSyncLocation(VALID, { ...VALID, city: 'Port-Gentil' })).toBe(true)
  })

  it('synchronise lorsque la province change', () => {
    expect(shouldSyncLocation(VALID, { ...VALID, province: 'Ogooué-Maritime' })).toBe(true)
  })

  it('synchronise lorsque la rue change', () => {
    expect(shouldSyncLocation(VALID, { ...VALID, street: 'Nombakélé' })).toBe(true)
  })

  it('ignore un document sans province ou sans ville', () => {
    expect(shouldSyncLocation(undefined, { ...VALID, province: '' })).toBe(false)
    expect(shouldSyncLocation(undefined, { ...VALID, city: '' })).toBe(false)
  })

  it('ignore une annonce Mode ne contenant que cities/zones', () => {
    expect(shouldSyncLocation(undefined, { ...VALID, cities: ['Libreville'] })).toBe(false)
  })

  it('synchronise quand la localisation devient exploitable après coup', () => {
    expect(shouldSyncLocation({ province: '', city: '' }, VALID)).toBe(true)
  })

  it('distingue les coordonnées de hiérarchie de toute coordonnée de bien exact (non comparées)', () => {
    // latitude/longitude (position exacte du bien) ne font pas partie des champs comparés :
    // leur changement seul ne doit pas déclencher la synchronisation géographique.
    expect(
      shouldSyncLocation({ ...VALID, latitude: 1, longitude: 1 }, { ...VALID, latitude: 2, longitude: 2 }),
    ).toBe(false)
  })
})
