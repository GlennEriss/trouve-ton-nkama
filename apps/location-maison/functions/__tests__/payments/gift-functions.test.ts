import crypto from 'crypto'

const mockCollection = jest.fn()
const mockRunTransaction = jest.fn()
const mockSendUserPush = jest.fn()
const mockGenerateTransactionId = jest.fn(() => 'GIFT_TEST_001')

jest.mock('firebase-functions/v2/https', () => ({
  onRequest: (_options: unknown, handler: unknown) => handler,
}))

jest.mock('../../src/admin', () => ({
  adminDB: {
    collection: (...args: unknown[]) => mockCollection(...args),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  },
}))

jest.mock('../../src/notification/push', () => ({
  sendUserPush: (...args: unknown[]) => mockSendUserPush(...args),
}))

jest.mock('../../src/payments/airtel/config', () => ({
  generateTransactionId: () => mockGenerateTransactionId(),
}))

import { initiateGiftPayment } from '../../src/payments/gifts/initiateGiftPayment'
import { giftPaymentCallback } from '../../src/payments/gifts/webhook'

type JsonResponse = {
  status: jest.Mock
  json: jest.Mock
}

function createResponse(): JsonResponse {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  }
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

function createQuery(size = 0) {
  const query: Record<string, jest.Mock> = {
    where: jest.fn(),
    limit: jest.fn(),
    get: jest.fn().mockResolvedValue({ size }),
  }
  query.where.mockReturnValue(query)
  query.limit.mockReturnValue(query)
  return query
}

function validGiftBody(overrides: Record<string, unknown> = {}) {
  return {
    reelId: 'reel-1',
    amount: 1000,
    network: 'AM',
    phoneNumber: '077123456',
    message: 'Bravo pour cette annonce',
    ...overrides,
  }
}

function callbackBody(
  secret: string,
  overrides: Record<string, string> = {},
): Record<string, string> {
  const payload = {
    unique_id: 'GIFT_TEST_001',
    amount: '1000',
    order_status: '200',
    status_request: '200',
    payment_token: 'token-1',
    payment_method: 'AM',
    message: 'Success',
    client_phone: '077123456',
    currency: 'XAF',
    ...overrides,
  }
  const hashInput = [
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
    hash: crypto.createHmac('sha512', secret).update(hashInput).digest('hex'),
  }
}

describe('initiateGiftPayment HTTP contract', () => {
  const originalEnv = process.env
  let transactionRef: ReturnType<typeof createTransactionRef>
  let pendingQuery: ReturnType<typeof createQuery>

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      MYPAYGA_API_KEY: 'test-api-key',
      MYPAYGA_GIFT_CALLBACK_URL: 'https://example.test/gifts/callback',
      MYPAYGA_API_BASE_URL: 'https://provider.test/',
      MYPAYGA_PAYMENT_TIMEOUT_MS: '1500',
    }
    transactionRef = createTransactionRef()
    pendingQuery = createQuery(0)

    mockCollection.mockImplementation((name: string) => {
      if (name === 'reels') {
        return {
          doc: () => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ createdBy: 'announcer-1', moderationStatus: 'APPROVED' }),
            }),
          }),
        }
      }
      if (name === 'properties') {
        return {
          doc: () => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                createdBy: 'announcer-2',
                moderationStatus: 'APPROVED',
                state: 'IN_PROGRESS',
              }),
            }),
          }),
        }
      }
      if (name === 'gift_transactions') {
        return {
          where: (...args: unknown[]) => pendingQuery.where(...args),
          doc: () => transactionRef,
        }
      }
      throw new Error(`Unexpected collection: ${name}`)
    })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        request_status: 200,
        message: 'Demande envoyée',
        payment_token: 'provider-token',
      }),
    }) as jest.Mock
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it.each([
    ['GET', validGiftBody(), 405, 'method_not_allowed'],
    ['POST', { amount: 1000, phoneNumber: '077123456' }, 400, 'target_required'],
    ['POST', validGiftBody({ propertyId: 'property-1' }), 400, 'ambiguous_target'],
    ['POST', validGiftBody({ amount: 499 }), 400, 'invalid_amount'],
    ['POST', validGiftBody({ phoneNumber: '066123456' }), 400, 'invalid_phone'],
  ])('refuse %s / %j avec %i (%s)', async (method, body, status, error) => {
    const response = createResponse()

    await (initiateGiftPayment as any)({ method, body }, response)

    expect(response.status).toHaveBeenCalledWith(status)
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error }))
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('refuse un reel non approuve ou sans annonceur', async () => {
    mockCollection.mockImplementation((name: string) => {
      if (name === 'reels') {
        return {
          doc: () => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ createdBy: '', moderationStatus: 'PENDING' }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected collection: ${name}`)
    })
    const response = createResponse()

    await (initiateGiftPayment as any)({ method: 'POST', body: validGiftBody() }, response)

    expect(response.status).toHaveBeenCalledWith(404)
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'reel_not_found' }))
  })

  it('applique le plafond anti-spam avant tout appel fournisseur', async () => {
    pendingQuery.get.mockResolvedValue({ size: 5 })
    const response = createResponse()

    await (initiateGiftPayment as any)({ method: 'POST', body: validGiftBody() }, response)

    expect(response.status).toHaveBeenCalledWith(429)
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'too_many_pending' }))
    expect(transactionRef.set).not.toHaveBeenCalled()
  })

  it('cree une transaction normalisee puis initie le paiement fournisseur', async () => {
    const response = createResponse()

    await (initiateGiftPayment as any)({
      method: 'POST',
      body: validGiftBody({
        phoneNumber: '+241 077 123 456',
        message: ` ${'x'.repeat(250)} `,
      }),
    }, response)

    expect(transactionRef.set).toHaveBeenCalledWith(expect.objectContaining({
      id: 'GIFT_TEST_001',
      donorPhone: '077123456',
      donorNetwork: 'AM',
      amountXaf: 1000,
      netAmountXaf: 850,
      announcerUid: 'announcer-1',
      message: 'x'.repeat(200),
    }))
    expect(global.fetch).toHaveBeenCalledWith(
      'https://provider.test/v1/payment',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(transactionRef.update).toHaveBeenCalledWith(expect.objectContaining({
      providerInitState: 'sent',
      providerPaymentToken: 'provider-token',
    }))
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      transactionId: 'GIFT_TEST_001',
    }))
  })

  it('accepte aussi une annonce publiee comme cible exclusive', async () => {
    const response = createResponse()

    await (initiateGiftPayment as any)({
      method: 'POST',
      body: validGiftBody({ reelId: undefined, propertyId: 'property-1' }),
    }, response)

    expect(transactionRef.set).toHaveBeenCalledWith(expect.objectContaining({
      reelId: null,
      propertyId: 'property-1',
      announcerUid: 'announcer-2',
      description: 'Cadeau sur une annonce',
    }))
    expect(response.status).toHaveBeenCalledWith(200)
  })

  it('persiste le refus du fournisseur sans confirmer le cadeau', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ request_status: 400, message: 'Solde insuffisant' }),
    })
    const response = createResponse()

    await (initiateGiftPayment as any)({ method: 'POST', body: validGiftBody() }, response)

    expect(transactionRef.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      paymentStatus: 'failed_provider',
      failureReason: 'Solde insuffisant',
    }))
    expect(response.status).toHaveBeenCalledWith(502)
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'provider_refused' }))
  })

  it('convertit une panne reseau en erreur fournisseur controlee', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network down'))
    const response = createResponse()

    await (initiateGiftPayment as any)({ method: 'POST', body: validGiftBody() }, response)

    expect(transactionRef.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      providerInitMessage: 'network down',
    }))
    expect(response.status).toHaveBeenCalledWith(502)
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'provider_unavailable' }))
  })
})

describe('giftPaymentCallback HTTP contract', () => {
  const originalEnv = process.env
  const secret = 'callback-secret'
  let transactionRef: ReturnType<typeof createTransactionRef>
  const transaction = {
    reelId: 'reel-1',
    announcerUid: 'announcer-1',
    amountXaf: 1000,
    netAmountXaf: 850,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, MYPAYGA_CALLBACK_SECRET: secret }
    transactionRef = createTransactionRef(transaction)
    mockCollection.mockImplementation((name: string) => {
      if (name === 'gift_transactions') return { doc: () => transactionRef }
      if (name === 'notifications') return { add: jest.fn().mockResolvedValue(undefined) }
      if (name === 'reels') return { doc: () => ({ id: 'reel-1' }) }
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

  it.each([
    ['PUT', {}, 405, 'method_not_allowed'],
    ['POST', {}, 400, 'invalid_callback_payload'],
    ['POST', { unique_id: 'GIFT_TEST_001', hash: 'bad' }, 401, 'invalid_signature'],
  ])('rejette un callback %s invalide avec le statut attendu', async (method, body, status, error) => {
    const response = createResponse()

    await (giftPaymentCallback as any)({ method, body, headers: {} }, response)

    expect(response.status).toHaveBeenCalledWith(status)
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error }))
  })

  it('refuse une transaction inconnue apres verification de signature', async () => {
    transactionRef = createTransactionRef()
    const response = createResponse()

    await (giftPaymentCallback as any)({
      method: 'POST',
      body: callbackBody(secret),
      headers: {},
    }, response)

    expect(response.status).toHaveBeenCalledWith(404)
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'transaction_not_found' }))
  })

  it('detecte une alteration du montant signe', async () => {
    const response = createResponse()

    await (giftPaymentCallback as any)({
      method: 'POST',
      body: callbackBody(secret, { amount: '1500' }),
      headers: {},
    }, response)

    expect(transactionRef.update).toHaveBeenCalledWith(expect.objectContaining({
      providerCallbackError: 'amount_mismatch',
      providerCallbackAmount: 1500,
    }))
    expect(response.status).toHaveBeenCalledWith(409)
  })

  it('enregistre un refus fournisseur comme resultat terminal rejouable', async () => {
    const response = createResponse()

    await (giftPaymentCallback as any)({
      method: 'POST',
      body: callbackBody(secret, {
        order_status: '400',
        status_request: '400',
        message: 'Refused',
      }),
      headers: {},
    }, response)

    expect(transactionRef.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      providerCallbackVerified: true,
      providerCallbackResult: 'failed',
    }))
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
    expect(mockRunTransaction).not.toHaveBeenCalled()
  })

  it('applique une confirmation une seule fois et notifie l annonceur', async () => {
    const userRef = { id: 'user-doc' }
    const tx = {
      get: jest.fn()
        .mockResolvedValueOnce({ data: () => ({ entitlementApplyState: 'pending' }) })
        .mockResolvedValueOnce({ empty: false, docs: [{ ref: userRef }] })
        .mockResolvedValueOnce({ exists: true }),
      update: jest.fn(),
    }
    mockRunTransaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx))
    const response = createResponse()

    await (giftPaymentCallback as any)({
      method: 'POST',
      body: callbackBody(secret),
      headers: { 'x-request-id': 'request-1' },
    }, response)

    expect(tx.update).toHaveBeenCalledTimes(3)
    expect(tx.update).toHaveBeenCalledWith(userRef, expect.objectContaining({ giftCountReceived: expect.anything() }))
    expect(transactionRef.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      fulfillmentStatus: 'applied',
      providerCallbackVerified: true,
    }))
    expect(mockSendUserPush).toHaveBeenCalledWith(expect.objectContaining({ uid: 'announcer-1' }))
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
  })

  it('ne renvoie pas une seconde notification quand le cadeau est deja applique', async () => {
    const tx = {
      get: jest.fn().mockResolvedValue({ data: () => ({ entitlementApplyState: 'applied' }) }),
      update: jest.fn(),
    }
    mockRunTransaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx))
    const response = createResponse()

    await (giftPaymentCallback as any)({
      method: 'POST',
      body: callbackBody(secret),
      headers: {},
    }, response)

    expect(tx.update).not.toHaveBeenCalled()
    expect(mockSendUserPush).not.toHaveBeenCalled()
    expect(response.status).toHaveBeenCalledWith(200)
  })
})
