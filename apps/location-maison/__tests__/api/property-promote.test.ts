import { getFirestore } from 'firebase-admin/firestore'

import { hashIdempotencyPayload } from '@/lib/server/idempotency'
import { auth } from '@/next-auth/auth'

let postPromote: typeof import('@/app/api/property/promote/route').POST

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => payload,
    }),
  },
}))

jest.mock('@/next-auth/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/firebase/admin', () => ({
  adminApp: { name: 'test-admin-app' },
}))

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toMillis: () => 1_000 })),
    fromMillis: jest.fn((ms: number) => ({ toMillis: () => ms })),
  },
  FieldValue: {
    arrayUnion: jest.fn((value: unknown) => ({ __type: 'arrayUnion', value })),
  },
}))

type FakeRef = {
  __collection: string
  id: string
}

function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
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

function makeSnapshot(data: Record<string, unknown> | null) {
  return {
    exists: Boolean(data),
    data: () => data,
  }
}

function makePromoteDb(options: {
  userData?: Record<string, unknown> | null
  propertyData?: Record<string, unknown> | null
  idempotencyData?: Record<string, unknown> | null
} = {}) {
  const userData = options.userData === undefined ? { uid: 'uid-1', credits: 20 } : options.userData
  const propertyData = options.propertyData === undefined
    ? { id: 'property-1', createdBy: 'uid-1', title: 'Belle chambre' }
    : options.propertyData

  const userRef: FakeRef = { __collection: 'users', id: 'user-doc-1' }
  const propertyRef: FakeRef = { __collection: 'properties', id: 'property-1' }
  const transactionRef: FakeRef = { __collection: 'credit_transactions', id: 'transaction-1' }
  const idempotencyRef: FakeRef = { __collection: 'idempotency_keys', id: 'idempotency-1' }

  const transaction = {
    get: jest.fn(async (ref: FakeRef) => {
      if (ref === idempotencyRef) return makeSnapshot(options.idempotencyData ?? null)
      if (ref === userRef) return makeSnapshot(userData)
      if (ref === propertyRef) return makeSnapshot(propertyData)
      return makeSnapshot(null)
    }),
    update: jest.fn(),
    set: jest.fn(),
    create: jest.fn(),
  }

  const db = {
    collection: jest.fn((collectionName: string) => ({
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn(async () => ({
            empty: !userData,
            docs: userData ? [{ ref: userRef, data: () => userData }] : [],
          })),
        })),
      })),
      doc: jest.fn(() => {
        if (collectionName === 'properties') return propertyRef
        if (collectionName === 'credit_transactions') return transactionRef
        if (collectionName === 'idempotency_keys') return idempotencyRef
        throw new Error(`Unexpected doc collection ${collectionName}`)
      }),
    })),
    runTransaction: jest.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  }

  return {
    db,
    transaction,
    refs: {
      userRef,
      propertyRef,
      transactionRef,
      idempotencyRef,
    },
  }
}

describe('/api/property/promote', () => {
  beforeAll(async () => {
    ;({ POST: postPromote } = await import('@/app/api/property/promote/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'uid-1' } })
  })

  it('refuse une promotion sans session', async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)
    const { db } = makePromoteDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postPromote(makeRequest({ propertyId: 'property-1', promotionType: 'featured' }))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({
      success: false,
      message: 'Authentification requise.',
    })
    expect(getFirestore).not.toHaveBeenCalled()
  })

  it('refuse une promotion invalide avant Firestore', async () => {
    const { db } = makePromoteDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postPromote(makeRequest({ propertyId: '', promotionType: 'unknown' }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      message: 'Promotion invalide.',
    })
    expect(getFirestore).not.toHaveBeenCalled()
  })

  it('debite les credits et active la promotion dans une transaction', async () => {
    const { db, transaction, refs } = makePromoteDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postPromote(makeRequest({ propertyId: 'property-1', promotionType: 'featured' }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      promotionType: 'featured',
      creditsUsed: 15,
      creditsRemaining: 5,
      transactionId: 'transaction-1',
    })
    expect(transaction.update).toHaveBeenCalledWith(
      refs.userRef,
      expect.objectContaining({
        credits: 5,
      }),
    )
    expect(transaction.update).toHaveBeenCalledWith(
      refs.propertyRef,
      expect.objectContaining({
        isPromoted: true,
        currentPromotion: expect.objectContaining({
          type: 'featured',
          creditsUsed: 15,
          isActive: true,
        }),
      }),
    )
    expect(transaction.set).toHaveBeenCalledWith(
      refs.transactionRef,
      expect.objectContaining({
        uid: 'uid-1',
        type: 'spend',
        credits: -15,
        propertyId: 'property-1',
        status: 'success',
      }),
    )
  })

  it('rejoue une promotion idempotente sans redebiter', async () => {
    const { db, transaction } = makePromoteDb({
      idempotencyData: {
        requestHash: hashIdempotencyPayload({
          propertyId: 'property-1',
          promotionType: 'featured',
        }),
        status: 'completed',
        response: {
          nextCredits: 5,
          transactionId: 'transaction-existing',
        },
      },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postPromote(
      makeRequest(
        { propertyId: 'property-1', promotionType: 'featured' },
        { 'Idempotency-Key': 'promotion-key-1' },
      ),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      replayed: true,
      creditsRemaining: 5,
      transactionId: 'transaction-existing',
    })
    expect(transaction.update).not.toHaveBeenCalled()
    expect(transaction.set).not.toHaveBeenCalled()
    expect(transaction.create).not.toHaveBeenCalled()
  })

  it('refuse une annonce qui appartient a un autre utilisateur', async () => {
    const { db, transaction } = makePromoteDb({
      propertyData: { createdBy: 'other-uid', title: 'Annonce autre' },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postPromote(makeRequest({ propertyId: 'property-1', promotionType: 'featured' }))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toMatchObject({
      success: false,
      message: 'Vous ne pouvez promouvoir que vos annonces.',
    })
    expect(transaction.update).not.toHaveBeenCalled()
    expect(transaction.set).not.toHaveBeenCalled()
  })

  it('refuse une promotion deja active du meme type', async () => {
    const { db, transaction } = makePromoteDb({
      propertyData: {
        createdBy: 'uid-1',
        title: 'Belle chambre',
        currentPromotion: {
          type: 'featured',
          isActive: true,
          endDate: { toMillis: () => Date.now() + 60_000 },
        },
      },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postPromote(makeRequest({ propertyId: 'property-1', promotionType: 'featured' }))
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload).toMatchObject({
      success: false,
      message: 'Cette promotion est déjà active.',
    })
    expect(transaction.update).not.toHaveBeenCalled()
    expect(transaction.set).not.toHaveBeenCalled()
  })

  it('refuse lorsque les credits utilisateur sont insuffisants', async () => {
    const { db, transaction } = makePromoteDb({
      userData: { uid: 'uid-1', credits: 2 },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postPromote(makeRequest({ propertyId: 'property-1', promotionType: 'featured' }))
    const payload = await response.json()

    expect(response.status).toBe(402)
    expect(payload).toMatchObject({
      success: false,
      code: 'INSUFFICIENT_CREDITS',
    })
    expect(transaction.update).not.toHaveBeenCalled()
    expect(transaction.set).not.toHaveBeenCalled()
  })
})
