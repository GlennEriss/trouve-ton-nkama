import { formatListingZones } from '../listingZones'

describe('formatListingZones', () => {
  it('utilise cities quand présent', () => {
    expect(formatListingZones({ cities: ['Libreville', 'Franceville'] })).toBe('Libreville, Franceville')
  })

  it('replie sur city seul quand cities absent (immobilier, Mode pré-migration)', () => {
    expect(formatListingZones({ city: 'Libreville' })).toBe('Libreville')
  })

  it('ignore un tableau cities vide et replie sur city', () => {
    expect(formatListingZones({ city: 'Oyem', cities: [] })).toBe('Oyem')
  })

  it('tronque au-delà du max avec un suffixe +N', () => {
    expect(formatListingZones({ cities: ['A', 'B', 'C'] }, 2)).toBe('A, B +1')
  })

  it('chaîne vide sans city ni cities', () => {
    expect(formatListingZones({})).toBe('')
  })
})
