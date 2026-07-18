import { getFirestore } from 'firebase-admin/firestore'

import { adminAuth } from '@/firebase/admin'
import { deriveGiftBalance } from '@/lib/gifts/balance'
import { auth } from '@/next-auth/auth'

let getGiftSummary: typeof import('@/app/api/gifts/summary/route').GET

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
}))

jest.mock('@/lib/gifts/balance', () => ({
  deriveGiftBalance: jest.fn(),
}))

function makeRequest(headers: Record<string, string> = { authorization: 'Bearer valid-token' }) {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  )

  return {
    headers: {
      get: (name: string) => normalizedHeaders.get(name.toLowerCase()) ?? null,
    },
  } as any
}

function makeDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
  }
}

function makeQuery(docs: Array<ReturnType<typeof makeDoc>>) {
  const query: {
    where: jest.Mock
    orderBy: jest.Mock
    limit: jest.Mock
    get: jest.Mock
  } = {
    where: jest.fn(() => query),
    orderBy: jest.fn(() => query),
    limit: jest.fn(() => query),
    get: jest.fn(async () => ({ docs })),
  }
  return query
}

function makeSummaryDb() {
  const giftQuery = makeQuery([
    makeDoc('gift-1', {
      netAmountXaf: 850,
      message: 'Merci',
      reelId: 'reel-1',
      donorPhone: '077123456',
      createdAt: { toDate: () => new Date('2026-07-18T10:00:00.000Z') },
    }),
    makeDoc('gift-2', {
      netAmountXaf: 500,
      donorPhone: '12',
    }),
  ])
  const withdrawalQuery = makeQuery([
    makeDoc('withdrawal-1', {
      montantXaf: 10_000,
      feeXaf: 500,
      netPayoutXaf: 9_500,
      numero: '077123456',
      reseau: 'AM',
      statut: 'EN_ATTENTE',
      dateCreation: { toDate: () => new Date('2026-07-18T11:00:00.000Z') },
    }),
  ])

  const db = {
    collection: jest.fn((collectionName: string) => {
      if (collectionName === 'gift_transactions') return giftQuery
      if (collectionName === 'gift_withdrawals') return withdrawalQuery
      throw new Error(`Unexpected collection ${collectionName}`)
    }),
  }

  return { db, giftQuery, withdrawalQuery }
}

describe('/api/gifts/summary', () => {
  beforeAll(async () => {
    ;({ GET: getGiftSummary } = await import('@/app/api/gifts/summary/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue(null)
    ;(adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'announcer-1' })
    ;(deriveGiftBalance as jest.Mock).mockResolvedValue({
      totalRecuXaf: 20_000,
      disponibleXaf: 10_000,
      totalRetireXaf: 5_000,
      hasPendingWithdrawal: true,
    })
  })

  it('refuse une requete non authentifiee', async () => {
    const { db } = makeSummaryDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await getGiftSummary(makeRequest({}))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
      },
    })
    expect(adminAuth.verifyIdToken).not.toHaveBeenCalled()
    expect(deriveGiftBalance).not.toHaveBeenCalled()
  })

  it('retourne le solde, les dons masques et les retraits', async () => {
    const { db, giftQuery, withdrawalQuery } = makeSummaryDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await getGiftSummary(makeRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(deriveGiftBalance).toHaveBeenCalledWith('announcer-1')
    expect(giftQuery.limit).toHaveBeenCalledWith(50)
    expect(withdrawalQuery.limit).toHaveBeenCalledWith(50)
    expect(payload).toMatchObject({
      balance: {
        disponibleXaf: 10_000,
        hasPendingWithdrawal: true,
      },
      gifts: [
        {
          id: 'gift-1',
          netAmountXaf: 850,
          message: 'Merci',
          reelId: 'reel-1',
          donorPhoneMasked: '077****56',
          createdAt: '2026-07-18T10:00:00.000Z',
        },
        {
          id: 'gift-2',
          netAmountXaf: 500,
          donorPhoneMasked: '**',
          createdAt: null,
        },
      ],
      withdrawals: [
        {
          id: 'withdrawal-1',
          montantXaf: 10_000,
          feeXaf: 500,
          netPayoutXaf: 9_500,
          numero: '077123456',
          reseau: 'AM',
          statut: 'EN_ATTENTE',
          dateCreation: '2026-07-18T11:00:00.000Z',
        },
      ],
    })
  })

  it('utilise la session web sans exiger de jeton Firebase', async () => {
    const { db } = makeSummaryDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'session-announcer' } })

    const response = await getGiftSummary(makeRequest({}))

    expect(response.status).toBe(200)
    expect(deriveGiftBalance).toHaveBeenCalledWith('session-announcer')
    expect(adminAuth.verifyIdToken).not.toHaveBeenCalled()
  })
})
