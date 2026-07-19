import { createLogger } from '@/lib/logger'
import {
  attachRequestId,
  createRequestLogContext,
  resolveRequestId,
} from '@/lib/observability/request-context'

function request(headers: Record<string, string> = {}, method = 'POST') {
  const normalized = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  )
  return {
    method,
    headers: {
      get: (name: string) => normalized.get(name.toLowerCase()) ?? null,
    },
  }
}

describe('observabilite structuree', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.restoreAllMocks()
    process.env = { ...originalEnv, NODE_ENV: 'test', LOG_LEVEL: 'debug' }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('reutilise un request id valide et refuse les valeurs dangereuses', () => {
    expect(resolveRequestId(request({ 'x-request-id': 'request-lot6d-123' })))
      .toBe('request-lot6d-123')
    expect(resolveRequestId(request({ 'x-request-id': 'invalide avec espaces' })))
      .toMatch(/^[a-f0-9-]{36}$/)
  })

  it('construit un contexte operationnel stable', () => {
    expect(createRequestLogContext(
      request({ 'x-request-id': 'request-lot6d-456' }),
      'reel.create',
      'reel_lifecycle',
    )).toEqual({
      requestId: 'request-lot6d-456',
      operation: 'reel.create',
      incidentCategory: 'reel_lifecycle',
      method: 'POST',
    })
  })

  it('masque les secrets, signatures et donnees personnelles', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const logger = createLogger('lot6d', {
      requestId: 'request-lot6d-789',
      operation: 'payment.callback',
    })

    logger.error('Payment callback failed', {
      email: 'client@example.com',
      clientPhone: '+241077000000',
      callbackSignature: 'secret-signature',
      rawBody: 'payment_token=secret',
      safeCode: 'AMOUNT_MISMATCH',
      longText: 'x'.repeat(1200),
    })

    const payload = JSON.parse(String(errorSpy.mock.calls[0][0]))
    expect(payload.context).toMatchObject({
      requestId: 'request-lot6d-789',
      operation: 'payment.callback',
      email: '[REDACTED]',
      clientPhone: '[REDACTED]',
      callbackSignature: '[REDACTED]',
      rawBody: '[REDACTED]',
      safeCode: 'AMOUNT_MISMATCH',
    })
    expect(payload.context.longText.endsWith('...[TRUNCATED]')).toBe(true)
  })

  it('retourne le request id dans la reponse quand des headers sont disponibles', () => {
    const set = jest.fn()
    const response = { headers: { set } }

    expect(attachRequestId(response, 'request-lot6d-response')).toBe(response)
    expect(set).toHaveBeenCalledWith('x-request-id', 'request-lot6d-response')
  })
})
