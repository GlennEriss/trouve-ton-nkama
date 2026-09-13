import { generateLocationId } from '../../src/location/location-id'

describe('generateLocationId', () => {
  it('reproduit le format historique du client (nom_lon_lat, 5 décimales)', () => {
    expect(generateLocationId('Libreville', 9.45, 0.39)).toBe('libreville_9.45000_0.39000')
  })

  it('normalise les espaces et la casse du nom', () => {
    expect(generateLocationId('Port Gentil', 8.78, -0.72)).toBe('portgentil_8.78000_-0.72000')
  })

  it('retombe sur le format historique 0.00000 sans coordonnées', () => {
    expect(generateLocationId('Libreville')).toBe('libreville_0.00000_0.00000')
  })

  it('retombe sur le format historique quand une seule coordonnée est fournie', () => {
    expect(generateLocationId('Libreville', 9.45, undefined)).toBe('libreville_0.00000_0.00000')
  })
})
