import {
  formatPhoneNumberForDisplay,
  normalizePhoneNumberForFirebase,
  validatePhoneNumberForSupportedCountries,
} from '@/lib/phoneValidation'

describe('phone validation business rules', () => {
  it('accepte les numeros gabonais avec ou sans 0 local', () => {
    expect(validatePhoneNumberForSupportedCountries('066545430')).toMatchObject({
      isValid: true,
      country: 'GA',
    })
    expect(validatePhoneNumberForSupportedCountries('66545430')).toMatchObject({
      isValid: true,
      country: 'GA',
    })
    expect(validatePhoneNumberForSupportedCountries('+241066545430')).toMatchObject({
      isValid: true,
      country: 'GA',
    })
  })

  it('normalise les nouveaux numeros gabonais en retirant le premier 0 local', () => {
    expect(normalizePhoneNumberForFirebase('066545430')).toBe('+24166545430')
    expect(normalizePhoneNumberForFirebase('+241066545430')).toBe('+24166545430')
    expect(normalizePhoneNumberForFirebase('66545430')).toBe('+24166545430')
  })

  it('conserve les anciens formats gabonais compatibles quand le 0 fait partie du numero', () => {
    expect(normalizePhoneNumberForFirebase('01234567')).toBe('+24101234567')
  })

  it('refuse les numeros trop courts ou vides', () => {
    expect(validatePhoneNumberForSupportedCountries('')).toMatchObject({
      isValid: false,
      country: null,
    })
    expect(validatePhoneNumberForSupportedCountries('123')).toMatchObject({
      isValid: false,
    })
  })

  it('formate les numeros gabonais deja normalises pour affichage', () => {
    expect(formatPhoneNumberForDisplay('+24166545430')).toBe('+241 66 54 54 30')
  })
})
