import crypto from 'crypto'

const mockCollection = jest.fn()
const mockRunTransaction = jest.fn()
const mockGetCreditPackById = jest.fn()
const mockGenerateTransactionId = jest.fn(() => 'CREDIT_TEST_001')

jest.mock('firebase-functions/v2/https', () => {
  const actual = jest.requireActual('firebase-functions/v2/https')
  return {
    ...actual,
    onCall: (_options: unknown, handler: unknown) => handler,
    onRequest: (_options: unknown, handler: unknown) => handler,
  }
})

jest.mock('../../src/admin', () => ({
  adminDB: {
    collection: (...args: unknown[]) => mockCollection(...args),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  },
}))

jest.mock('../../src/payments/airtel/config', () => ({
  generateTransactionId: () => mockGenerateTransactionId(),
}))

jest.mock('../../src/payments/airtel/database', () => ({
  getCreditPackById: (...args: unknown[]) => mockGetCreditPackById(...args),
}))

import { initiatePurchase } from '../../src/payments/mypayga/initiatePurchase'
import { mypaygaPaymentCallback } from '../../src/payments/mypayga/webhook'

function createResponse() {
  const response = { status: jest.fn(), json: jest.fn() }
  response.status.mockReturnValue(response)
  return response
}

function createTransactionRef(transaction: Record<string, unknown> = {}) {
  return {
    get: jest.fn().mockResolvedValue({
      exists: Object.keys(transaction).length > 0,
      data: () => transaction,
    }),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  }
}

function callbackBody(secret: string, overrides: Record<string, string> = {}) {
  const payload = {
    unique_id: 'CREDIT_TEST_001',
    amount: '5000',
    order_status: '200',
    status_request: '200',
    payment_token: 'token-credit',
    payment_method: 'AM',
    message: 'Success',
    client_phone: '077123456',
    currency: 'XAF',
    ...overrides,
  }
  const input = [
    payload.order_status,
    payload.unique_id,
    payload.amount,
    payload.payment_token,
    payload.payment_method,
    payload.message,
    payload.client_phone,
  ].join('')
  return {
    ...payload,
    hash: crypto.createHmac('sha512', secret).update(input).digest('hex'),
  }
}

describe('initiatePurchase MyPayGa', () => {
  const originalEnv = process.env
  let transactionRef: ReturnType<typeof createTransactionRef>

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      MYPAYGA_API_KEY: 'api-key',
      MYPAYGA_CALLBACK_URL: 'https://example.test/credits/callback',
      MYPAYGA_API_BASE_URL: 'https://provider.test/',
      MYPAYGA_PAYMENT_TIMEOUT_MS: '1500',
    }
    transactionRef = createTransactionRef()
    mockCollection.mockReturnValue({ doc: () => transactionRef })
    mockGetCreditPackById.mockResolvedValue({
      id: 'pack-50',
      name: 'Pack 50',
      credits: 50,
      price: 5000,
    })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        request_status: 200,
        message: 'Demande envoyee',
        payment_token: 'provider-token',
      }),
    }) as jest.Mock
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('exige une authentification Firebase', async () => {
    await expect((initiatePurchase as any)({
      auth: null,
      data: { packId: 'pack-50', phoneNumber: '077123456' },
    })).rejects.toMatchObject({ code: 'unauthenticated' })
  })

  it.each([
    [{ packId: '', phoneNumber: '077123456' }, 'invalid-argument'],
    [{ packId: 'pack-50', phoneNumber: '' }, 'invalid-argument'],
    [{ packId: 'pack-50', phoneNumber: '066123456', network: 'AM' }, 'invalid-argument'],
  ])('valide les arguments avant de lire le pack: %j', async (data, code) => {
    await expect((initiatePurchase as any)({ auth: { uid: 'user-1' }, data }))
      .rejects.toMatchObject({ code })
    expect(mockGetCreditPackById).not.toHaveBeenCalled()
  })

  it('refuse un pack inexistant', async () => {
    mockGetCreditPackById.mockResolvedValue(null)

    await expect((initiatePurchase as any)({
      auth: { uid: 'user-1' },
      data: { packId: 'missing', phoneNumber: '077123456' },
    })).rejects.toMatchObject({ code: 'not-found' })
  })

  it('refuse une configuration fournisseur incomplete', async () => {
    delete process.env.MYPAYGA_API_KEY

    await expect((initiatePurchase as any)({
      auth: { uid: 'user-1' },
      data: { packId: 'pack-50', phoneNumber: '077123456' },
    })).rejects.toMatchObject({ code: 'failed-precondition' })
  })

  it('cree la transaction et retourne le token fournisseur', async () => {
    const result = await (initiatePurchase as any)({
      auth: { uid: 'user-1' },
      data: { packId: 'pack-50', phoneNumber: '+241 077 123 456', network: 'airtel' },
    })

    expect(transactionRef.set).toHaveBeenCalledWith(expect.objectContaining({
      id: 'CREDIT_TEST_001',
      uid: 'user-1',
      credits: 50,
      amount: 5000,
      phoneNumber: '077123456',
      providerNetwork: 'AM',
      entitlementApplyState: 'pending',
    }))
    expect(global.fetch).toHaveBeenCalledWith(
      'https://provider.test/v1/payment',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(transactionRef.update).toHaveBeenCalledWith(expect.objectContaining({
      providerInitState: 'sent',
      providerPaymentToken: 'provider-token',
    }))
    expect(result).toEqual(expect.objectContaining({
      success: true,
      transactionId: 'CREDIT_TEST_001',
      providerPaymentToken: 'provider-token',
    }))
  })

  it('conserve le refus fournisseur comme erreur aborted', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ request_status: 400, message: 'Refused' }),
    })

    await expect((initiatePurchase as any)({
      auth: { uid: 'user-1' },
      data: { packId: 'pack-50', phoneNumber: '077123456' },
    })).rejects.toMatchObject({ code: 'aborted' })

    expect(transactionRef.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      failureReason: 'Refused',
    }))
  })

  it('convertit une panne reseau en erreur unavailable et la persiste', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('timeout'))

    await expect((initiatePurchase as any)({
      auth: { uid: 'user-1' },
      data: { packId: 'pack-50', phoneNumber: '077123456' },
    })).rejects.toMatchObject({ code: 'unavailable' })

    expect(transactionRef.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      providerInitMessage: 'timeout',
    }))
  })
})

describe('mypaygaPaymentCallback credits', () => {
  const originalEnv = process.env
  const secret = 'callback-secret'
  const transaction = { uid: 'user-1', credits: 50, amount: 5000 }
  let transactionRef: ReturnType<typeof createTransactionRef>

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, MYPAYGA_CALLBACK_SECRET: secret }
    transactionRef = createTransactionRef(transaction)
    mockCollection.mockImplementation((name: string) => {
      if (name === 'credit_transactions') return { doc: () => transactionRef }
      if (name === 'users') {
        const query = { where: jest.fn(), limit: jest.fn() }
        query.where.mockReturnValue(query)
        query.limit.mockReturnValue(query)
        return query
      }
      throw new Error(`Unexpected collection: ${name}`)
    })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('refuse une methode non supportee et une signature invalide', async () => {
    const methodResponse = createResponse()
    await (mypaygaPaymentCallback as any)({ method: 'DELETE', body: {}, headers: {} }, methodResponse)
    expect(methodResponse.status).toHaveBeenCalledWith(405)

    const signatureResponse = createResponse()
    await (mypaygaPaymentCallback as any)({
      method: 'POST',
      body: { unique_id: 'CREDIT_TEST_001', hash: 'bad' },
      headers: {},
    }, signatureResponse)
    expect(signatureResponse.status).toHaveBeenCalledWith(401)
  })

  it('bloque un montant different de la transaction initiee', async () => {
    const response = createResponse()

    await (mypaygaPaymentCallback as any)({
      method: 'POST',
      body: callbackBody(secret, { amount: '6000' }),
      headers: {},
    }, response)

    expect(response.status).toHaveBeenCalledWith(409)
    expect(transactionRef.update).toHaveBeenCalledWith(expect.objectContaining({
      providerCallbackError: 'amount_mismatch',
    }))
  })

  it('applique les credits atomiquement une seule fois', async () => {
    const userRef = { id: 'user-doc' }
    const tx = {
      get: jest.fn()
        .mockResolvedValueOnce({ data: () => ({ entitlementApplyState: 'pending' }) })
        .mockResolvedValueOnce({ empty: false, docs: [{ ref: userRef }] }),
      update: jest.fn(),
    }
    mockRunTransaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx))
    const response = createResponse()

    await (mypaygaPaymentCallback as any)({
      method: 'POST',
      body: callbackBody(secret),
      headers: { 'x-request-id': 'credit-request-1' },
    }, response)

    expect(tx.update).toHaveBeenCalledTimes(2)
    expect(tx.update).toHaveBeenCalledWith(userRef, expect.objectContaining({ credits: expect.anything() }))
    expect(transactionRef.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      fulfillmentStatus: 'applied',
    }))
    expect(response.status).toHaveBeenCalledWith(200)
  })

  it('ne credite pas a nouveau une transaction deja appliquee', async () => {
    const tx = {
      get: jest.fn().mockResolvedValue({ data: () => ({ fulfillmentStatus: 'applied' }) }),
      update: jest.fn(),
    }
    mockRunTransaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx))
    const response = createResponse()

    await (mypaygaPaymentCallback as any)({
      method: 'GET',
      query: callbackBody(secret),
      body: undefined,
      headers: {},
    }, response)

    expect(tx.update).not.toHaveBeenCalled()
    expect(transactionRef.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(response.status).toHaveBeenCalledWith(200)
  })

  it('enregistre proprement un paiement refuse', async () => {
    const response = createResponse()

    await (mypaygaPaymentCallback as any)({
      method: 'POST',
      body: callbackBody(secret, {
        order_status: '400',
        status_request: '400',
        message: 'Refused',
      }),
      headers: {},
    }, response)

    expect(mockRunTransaction).not.toHaveBeenCalled()
    expect(transactionRef.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      providerCallbackResult: 'failed',
    }))
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
  })
})
