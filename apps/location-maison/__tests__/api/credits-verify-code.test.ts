import { adminApp, adminAuth } from '@/firebase/admin'

let postVerifyCode: typeof import('@/app/api/credits/verify-code/route').POST

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => payload,
    }),
  },
}))

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

jest.mock('@/firebase/admin', () => ({
  adminApp: {
    firestore: jest.fn(),
  },
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
}))

type FakeRef = {
  __collection: string
  id: string
}

type FakeDoc = {
  id: string
  ref: FakeRef
  data: () => Record<string, unknown>
}

function makeRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = { authorization: 'Bearer valid-token' },
) {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  )

  return {
    headers: {
      get: (name: string) => normalizedHeaders.get(name.toLowerCase()) ?? null,
    },
    json: async () => body,
  } as any
}

function makeDocSnapshot(data: Record<string, unknown> | null) {
  return {
    exists: Boolean(data),
    data: () => data,
  }
}

function makeQuerySnapshot(doc: FakeDoc | null) {
  return {
    empty: !doc,
    docs: doc ? [doc] : [],
  }
}

function makeWhereQuery(snapshot: ReturnType<typeof makeQuerySnapshot>) {
  const query: {
    where: jest.Mock
    limit: jest.Mock
  } = {
    where: jest.fn(() => query),
    limit: jest.fn(() => ({
      get: jest.fn(async () => snapshot),
    })),
  }
  return query
}

function makeVerifyCodeDb(options: {
  paymentData?: Record<string, unknown> | null
  freshPaymentData?: Record<string, unknown> | null
  userData?: Record<string, unknown> | null
  freshUserData?: Record<string, unknown> | null
} = {}) {
  const paymentData = options.paymentData === undefined
    ? {
        name: 'Pack boost',
        credits: 70,
        amount: 10_000,
        status: 'pending',
        phoneNumber: '077123456',
      }
    : options.paymentData
  const userData = options.userData === undefined ? { uid: 'user-1', credits: 12 } : options.userData

  const paymentRef: FakeRef = { __collection: 'credit_payments', id: 'payment-1' }
  const userRef: FakeRef = { __collection: 'users', id: 'user-doc-1' }
  const paymentDoc: FakeDoc | null = paymentData
    ? { id: 'payment-1', ref: paymentRef, data: () => paymentData }
    : null
  const userDoc: FakeDoc | null = userData
    ? { id: 'user-doc-1', ref: userRef, data: () => userData }
    : null

  const paymentQuery = makeWhereQuery(makeQuerySnapshot(paymentDoc))
  const userQuery = makeWhereQuery(makeQuerySnapshot(userDoc))
  const transactionRef: FakeRef = { __collection: 'credit_transactions', id: 'manual-code-payment-1-user-1' }
  const creditTransactionsCollection = {
    doc: jest.fn(() => transactionRef),
  }
  const transaction = {
    get: jest.fn(async (ref: FakeRef) => {
      if (ref === paymentRef) {
        return makeDocSnapshot(options.freshPaymentData === undefined ? paymentData : options.freshPaymentData)
      }
      if (ref === userRef) {
        return makeDocSnapshot(options.freshUserData === undefined ? userData : options.freshUserData)
      }
      return makeDocSnapshot(null)
    }),
    update: jest.fn(),
    set: jest.fn(),
  }
  const db = {
    collection: jest.fn((collectionName: string) => {
      if (collectionName === 'credit_payments') return paymentQuery
      if (collectionName === 'users') return userQuery
      if (collectionName === 'credit_transactions') return creditTransactionsCollection
      throw new Error(`Unexpected collection ${collectionName}`)
    }),
    runTransaction: jest.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  }

  return {
    db,
    transaction,
    refs: {
      paymentRef,
      userRef,
      transactionRef,
    },
  }
}

describe('/api/credits/verify-code', () => {
  beforeAll(async () => {
    ;({ POST: postVerifyCode } = await import('@/app/api/credits/verify-code/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'user-1' })
  })

  it('refuse une requete sans token bearer', async () => {
    const { db } = makeVerifyCodeDb()
    ;(adminApp.firestore as jest.Mock).mockReturnValue(db)

    const response = await postVerifyCode(makeRequest({ code: 'ABC123', amount: 10_000 }, {}))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({
      success: false,
      message: "Token d'authentification requis",
    })
    expect(adminAuth.verifyIdToken).not.toHaveBeenCalled()
    expect(db.runTransaction).not.toHaveBeenCalled()
  })

  it('refuse un code introuvable ou deja utilise avant transaction', async () => {
    const { db } = makeVerifyCodeDb({ paymentData: null })
    ;(adminApp.firestore as jest.Mock).mockReturnValue(db)

    const response = await postVerifyCode(makeRequest({ code: 'BADCODE', amount: 10_000 }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      message: 'Code invalide ou déjà utilisé',
    })
    expect(db.runTransaction).not.toHaveBeenCalled()
  })

  it('refuse un montant qui ne correspond pas au code', async () => {
    const { db } = makeVerifyCodeDb()
    ;(adminApp.firestore as jest.Mock).mockReturnValue(db)

    const response = await postVerifyCode(makeRequest({ code: 'ABC123', amount: 5_000 }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      expectedAmount: 10_000,
    })
    expect(db.runTransaction).not.toHaveBeenCalled()
  })

  it('refuse quand le profil utilisateur est introuvable', async () => {
    const { db } = makeVerifyCodeDb({ userData: null })
    ;(adminApp.firestore as jest.Mock).mockReturnValue(db)

    const response = await postVerifyCode(makeRequest({ code: 'ABC123', amount: 10_000 }))
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload).toMatchObject({
      success: false,
      message: 'Utilisateur non trouvé',
    })
    expect(db.runTransaction).not.toHaveBeenCalled()
  })

  it('credite utilisateur et marque le paiement en succes dans une transaction', async () => {
    const { db, transaction, refs } = makeVerifyCodeDb()
    ;(adminApp.firestore as jest.Mock).mockReturnValue(db)

    const response = await postVerifyCode(makeRequest({ code: 'ABC123', amount: 10_000 }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      credits: 82,
    })
    expect(db.runTransaction).toHaveBeenCalledTimes(1)
    expect(transaction.update).toHaveBeenCalledWith(
      refs.paymentRef,
      expect.objectContaining({
        status: 'success',
        usedBy: 'user-1',
        usedAt: expect.any(Date),
      }),
    )
    expect(transaction.update).toHaveBeenCalledWith(
      refs.userRef,
      expect.objectContaining({
        credits: 82,
        updatedAt: expect.any(Date),
      }),
    )
    expect(transaction.set).toHaveBeenCalledWith(
      refs.transactionRef,
      expect.objectContaining({
        uid: 'user-1',
        type: 'purchase',
        packName: 'Pack boost',
        credits: 70,
        amount: 10_000,
        status: 'success',
        paymentCodeId: 'payment-1',
      }),
    )
  })

  it('refuse un rejeu concurrent detecte dans la transaction', async () => {
    const { db, transaction } = makeVerifyCodeDb({
      freshPaymentData: {
        name: 'Pack boost',
        credits: 70,
        amount: 10_000,
        status: 'success',
        usedBy: 'other-user',
      },
    })
    ;(adminApp.firestore as jest.Mock).mockReturnValue(db)

    const response = await postVerifyCode(makeRequest({ code: 'ABC123', amount: 10_000 }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      message: 'Code invalide ou déjà utilisé',
    })
    expect(transaction.update).not.toHaveBeenCalled()
    expect(transaction.set).not.toHaveBeenCalled()
  })
})
