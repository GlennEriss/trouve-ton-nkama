import { getFirestore } from 'firebase-admin/firestore'

import { adminAuth } from '@/firebase/admin'
import { auth } from '@/next-auth/auth'

let postWithdrawal: typeof import('@/app/api/gifts/withdrawals/route').POST

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
  adminApp: { name: 'test-admin-app' },
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
}))

jest.mock('@/next-auth/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
  FieldValue: {
    serverTimestamp: jest.fn(() => ({ __type: 'serverTimestamp' })),
  },
}))

type FakeQuery = {
  __collection: 'users' | 'gift_withdrawals'
}

type FakeRef = {
  __collection: 'gift_withdrawals'
  id: string
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

function makeQuerySnapshot(rows: Array<Record<string, unknown>>) {
  return {
    docs: rows.map((row) => ({
      data: () => row,
    })),
  }
}

function makeWithdrawalsDb(options: {
  giftTotalReceivedXaf?: number
  withdrawals?: Array<Record<string, unknown>>
} = {}) {
  const usersQuery: FakeQuery = { __collection: 'users' }
  const withdrawalsQuery: FakeQuery = { __collection: 'gift_withdrawals' }
  const withdrawalRef: FakeRef = { __collection: 'gift_withdrawals', id: 'withdrawal-1' }
  const transaction = {
    get: jest.fn(async (query: FakeQuery) => {
      if (query.__collection === 'users') {
        return makeQuerySnapshot([{ uid: 'announcer-1', giftTotalReceivedXaf: options.giftTotalReceivedXaf ?? 20_000 }])
      }
      if (query.__collection === 'gift_withdrawals') {
        return makeQuerySnapshot(options.withdrawals ?? [])
      }
      return makeQuerySnapshot([])
    }),
    create: jest.fn(),
  }
  const db = {
    collection: jest.fn((collectionName: string) => ({
      doc: jest.fn(() => withdrawalRef),
      where: jest.fn(() => {
        if (collectionName === 'users') {
          return {
            limit: jest.fn(() => usersQuery),
          }
        }
        if (collectionName === 'gift_withdrawals') {
          return withdrawalsQuery
        }
        throw new Error(`Unexpected collection ${collectionName}`)
      }),
    })),
    runTransaction: jest.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  }

  return {
    db,
    transaction,
    withdrawalRef,
  }
}

describe('/api/gifts/withdrawals', () => {
  beforeAll(async () => {
    ;({ POST: postWithdrawal } = await import('@/app/api/gifts/withdrawals/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue(null)
    ;(adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'announcer-1' })
  })

  it('refuse une requete non authentifiee', async () => {
    const { db } = makeWithdrawalsDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postWithdrawal(makeRequest({ numero: '077123456', reseau: 'AM' }, {}))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
      },
    })
    expect(adminAuth.verifyIdToken).not.toHaveBeenCalled()
    expect(db.runTransaction).not.toHaveBeenCalled()
  })

  it('refuse un corps invalide avant Firestore', async () => {
    const { db } = makeWithdrawalsDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postWithdrawal(makeRequest({ numero: '077', reseau: 'AM' }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
      },
    })
    expect(getFirestore).not.toHaveBeenCalled()
  })

  it('refuse un numero incompatible avec le reseau', async () => {
    const { db } = makeWithdrawalsDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postWithdrawal(makeRequest({ numero: '077123456', reseau: 'MM' }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_PHONE',
      },
    })
    expect(getFirestore).not.toHaveBeenCalled()
  })

  it('refuse si le solde disponible est sous le minimum', async () => {
    const { db, transaction } = makeWithdrawalsDb({ giftTotalReceivedXaf: 9_000 })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postWithdrawal(makeRequest({ numero: '+241077123456', reseau: 'AM' }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'BELOW_MINIMUM',
      },
    })
    expect(transaction.create).not.toHaveBeenCalled()
  })

  it('refuse une deuxieme demande lorsqu un retrait est deja en attente', async () => {
    const { db, transaction } = makeWithdrawalsDb({
      giftTotalReceivedXaf: 25_000,
      withdrawals: [{ montantXaf: 5_000, statut: 'EN_ATTENTE' }],
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postWithdrawal(makeRequest({ numero: '+241077123456', reseau: 'AM' }))
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'WITHDRAWAL_PENDING',
      },
    })
    expect(transaction.create).not.toHaveBeenCalled()
  })

  it('cree un retrait integral du disponible dans une transaction', async () => {
    const { db, transaction, withdrawalRef } = makeWithdrawalsDb({
      giftTotalReceivedXaf: 20_000,
      withdrawals: [
        { montantXaf: 5_000, statut: 'TRAITE' },
        { montantXaf: 99_999, statut: 'REFUSE' },
      ],
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postWithdrawal(makeRequest({ numero: '+241077123456', reseau: 'AM' }))
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload).toMatchObject({
      success: true,
      withdrawalId: 'withdrawal-1',
      montantXaf: 15_000,
    })
    expect(db.runTransaction).toHaveBeenCalledTimes(1)
    expect(transaction.create).toHaveBeenCalledWith(
      withdrawalRef,
      expect.objectContaining({
        id: 'withdrawal-1',
        announcerUid: 'announcer-1',
        montantXaf: 15_000,
        feeRate: 0.05,
        feeXaf: 750,
        netPayoutXaf: 14_250,
        numero: '077123456',
        reseau: 'AM',
        statut: 'EN_ATTENTE',
      }),
    )
  })

  it('cree un retrait avec la session web sans jeton Firebase', async () => {
    const { db, transaction, withdrawalRef } = makeWithdrawalsDb({
      giftTotalReceivedXaf: 20_000,
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'session-announcer' } })

    const response = await postWithdrawal(
      makeRequest({ numero: '+241077123456', reseau: 'AM' }, {}),
    )

    expect(response.status).toBe(201)
    expect(adminAuth.verifyIdToken).not.toHaveBeenCalled()
    expect(transaction.create).toHaveBeenCalledWith(
      withdrawalRef,
      expect.objectContaining({
        announcerUid: 'session-announcer',
      }),
    )
  })
})
