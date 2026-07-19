import {
  buildFunctionIncidentContext,
  safeHttpRequestContext,
  serializeFunctionError,
} from '../src/observability'

describe('Cloud Functions observability', () => {
  it('construit un incident filtre sans champs vides', () => {
    expect(buildFunctionIncidentContext({
      category: 'payment_callback',
      operation: 'mypayga.callback',
      incidentCode: 'AMOUNT_MISMATCH',
      retryable: false,
      requestId: 'trace-lot6d',
      transactionId: null,
    })).toEqual({
      incidentCategory: 'payment_callback',
      operation: 'mypayga.callback',
      incidentCode: 'AMOUNT_MISMATCH',
      retryable: false,
      requestId: 'trace-lot6d',
    })
  })

  it('resume une requete sans exposer son corps ni ses secrets', () => {
    const summary = safeHttpRequestContext({
      method: 'POST',
      headers: {
        'x-cloud-trace-context': 'trace-lot6d/123;o=1',
        'content-type': 'application/json',
        'content-length': '420',
      },
      body: {
        client_phone: '+241077000000',
        hash: 'signature-secrete',
        payment_token: 'token-secret',
      },
      query: { unique_id: 'transaction-secret' },
    })

    expect(summary).toEqual({
      requestId: 'trace-lot6d',
      method: 'POST',
      contentType: 'application/json',
      contentLength: 420,
      hasBody: true,
      hasQuery: true,
    })
    expect(JSON.stringify(summary)).not.toMatch(/077000000|signature-secrete|token-secret|transaction-secret/)
  })

  it('normalise les erreurs sans stack volumineuse', () => {
    const error = Object.assign(new Error('Provider unavailable'), { code: 'ETIMEDOUT' })
    expect(serializeFunctionError(error)).toEqual({
      name: 'Error',
      message: 'Provider unavailable',
      code: 'ETIMEDOUT',
    })
  })
})
