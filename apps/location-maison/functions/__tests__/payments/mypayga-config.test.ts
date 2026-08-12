import {
  MYPAYGA_CONFIG,
  getMyPayGaConfig,
  isPhoneValidForNetwork,
  normalizeMyPayGaNetwork,
  sanitizePhoneDigits,
  toLocalPhone,
} from '../../src/payments/mypayga/config'

describe('MyPayGa config business rules', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('normalise les reseaux Mobile Money supportes', () => {
    expect(normalizeMyPayGaNetwork('MM')).toBe('MM')
    expect(normalizeMyPayGaNetwork('moov')).toBe('MM')
    expect(normalizeMyPayGaNetwork('MOOV_MONEY')).toBe('MM')
    expect(normalizeMyPayGaNetwork('airtel')).toBe('AM')
    expect(normalizeMyPayGaNetwork(undefined)).toBe('AM')
  })

  it('nettoie et localise les numeros gabonais pour MyPayGa', () => {
    expect(sanitizePhoneDigits('+241 077-123-456')).toBe('241077123456')
    expect(toLocalPhone('+241 077 123 456')).toBe('077123456')
    expect(toLocalPhone('077123456')).toBe('077123456')
  })

  it('valide les prefixes Airtel Money et Moov Money', () => {
    expect(isPhoneValidForNetwork('+241074123456', 'AM')).toBe(true)
    expect(isPhoneValidForNetwork('+241076123456', 'AM')).toBe(true)
    expect(isPhoneValidForNetwork('+241077123456', 'AM')).toBe(true)
    expect(isPhoneValidForNetwork('+241066123456', 'MM')).toBe(true)
    expect(isPhoneValidForNetwork('+241065123456', 'MM')).toBe(true)

    expect(isPhoneValidForNetwork('+241066123456', 'AM')).toBe(false)
    expect(isPhoneValidForNetwork('+241074123456', 'MM')).toBe(false)
    expect(isPhoneValidForNetwork('123', 'AM')).toBe(false)
  })

  it('retourne les valeurs par defaut quand les secrets ne sont pas injectes', () => {
    delete process.env.MYPAYGA_API_BASE_URL
    delete process.env.MYPAYGA_COUNTRY
    delete process.env.MYPAYGA_CURRENCY
    delete process.env.MYPAYGA_PAYMENT_TIMEOUT_MS

    const config = getMyPayGaConfig()

    expect(config.apiBaseUrl).toBe(MYPAYGA_CONFIG.DEFAULT_API_BASE_URL)
    expect(config.country).toBe(MYPAYGA_CONFIG.DEFAULT_COUNTRY)
    expect(config.currency).toBe(MYPAYGA_CONFIG.DEFAULT_CURRENCY)
    expect(config.timeoutMs).toBe(MYPAYGA_CONFIG.DEFAULT_TIMEOUT_MS)
  })

  it('trim les variables et applique un timeout minimum', () => {
    process.env.MYPAYGA_API_BASE_URL = ' https://sandbox.mypayga.test '
    process.env.MYPAYGA_COUNTRY = ' ga '
    process.env.MYPAYGA_CURRENCY = ' XAF '
    process.env.MYPAYGA_PAYMENT_TIMEOUT_MS = '100'

    const config = getMyPayGaConfig()

    expect(config.apiBaseUrl).toBe('https://sandbox.mypayga.test')
    expect(config.country).toBe('GA')
    expect(config.currency).toBe('XAF')
    expect(config.timeoutMs).toBe(1500)
  })
})
