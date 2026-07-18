import { getFirestore } from 'firebase-admin/firestore'

import { adminAuth } from '@/firebase/admin'
import { auth } from '@/next-auth/auth'

let getBalance: typeof import('@/app/api/credits/balance/route').GET
let getPacks: typeof import('@/app/api/credits/packs/route').GET
let getHistory: typeof import('@/app/api/credits/history/route').GET

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

function makeRequest(url: string, authorization?: string) {
  const nextUrl = new URL(url)

  return {
    nextUrl,
    headers: {
      get: (name: string) => (
        name.toLowerCase() === 'authorization' ? authorization ?? null : null
      ),
    },
  } as any
}

function makeDocument(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
    ref: { update: jest.fn() },
  }
}

describe('routes API de lecture des crédits', () => {
  beforeAll(async () => {
    ;({ GET: getBalance } = await import('@/app/api/credits/balance/route'))
    ;({ GET: getPacks } = await import('@/app/api/credits/packs/route'))
    ;({ GET: getHistory } = await import('@/app/api/credits/history/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'session-user' } })
    ;(adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'token-user' })
  })

  it('lit le solde avec la session web sans jeton Firebase', async () => {
    const userDocument = makeDocument('user-document', { uid: 'session-user', credits: 169 })
    const query = {
      where: jest.fn(),
      limit: jest.fn(),
      get: jest.fn(async () => ({ empty: false, docs: [userDocument] })),
    }
    query.where.mockReturnValue(query)
    query.limit.mockReturnValue(query)
    const db = { collection: jest.fn(() => query) }
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await getBalance(makeRequest('http://localhost/api/credits/balance'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true, credits: 169 })
    expect(query.where).toHaveBeenCalledWith('uid', '==', 'session-user')
    expect(adminAuth.verifyIdToken).not.toHaveBeenCalled()
  })

  it('initialise les trois crédits de bienvenue si le solde est absent', async () => {
    const userDocument = makeDocument('user-document', { uid: 'session-user' })
    const query = {
      where: jest.fn(),
      limit: jest.fn(),
      get: jest.fn(async () => ({ empty: false, docs: [userDocument] })),
    }
    query.where.mockReturnValue(query)
    query.limit.mockReturnValue(query)
    ;(getFirestore as jest.Mock).mockReturnValue({ collection: jest.fn(() => query) })

    const response = await getBalance(makeRequest('http://localhost/api/credits/balance'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true, credits: 3 })
    expect(userDocument.ref.update).toHaveBeenCalledWith(expect.objectContaining({ credits: 3 }))
  })

  it('retourne uniquement les packs actifs dans l ordre configuré', async () => {
    const documents = [
      makeDocument('premium', { name: 'Premium', credits: 100, price: 20_000, order: 3 }),
      makeDocument('starter', { name: 'Starter', credits: '15', price: '3500', order: 1 }),
      makeDocument('archive', { name: 'Archive', credits: 5, price: 500, order: 0, isActive: false }),
    ]
    const collection = { get: jest.fn(async () => ({ docs: documents })) }
    ;(getFirestore as jest.Mock).mockReturnValue({ collection: jest.fn(() => collection) })

    const response = await getPacks(makeRequest('http://localhost/api/credits/packs'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.packs.map((pack: { id: string }) => pack.id)).toEqual(['starter', 'premium'])
    expect(payload.packs[0]).toMatchObject({ credits: 15, price: 3500 })
    expect(adminAuth.verifyIdToken).not.toHaveBeenCalled()
  })

  it('pagine et normalise l historique du propriétaire connecté', async () => {
    const documents = [
      makeDocument('transaction-3', {
        type: 'purchase',
        credits: 50,
        amount: 10_000,
        createdAt: { toDate: () => new Date('2026-07-18T12:00:00.000Z') },
      }),
      makeDocument('transaction-2', {
        credits: -3,
        service: 'Remonter une annonce',
        createdAt: '2026-07-18T11:00:00.000Z',
      }),
      makeDocument('transaction-1', { credits: -1 }),
    ]
    const countGet = jest.fn(async () => ({ data: () => ({ count: 3 }) }))
    const query = {
      where: jest.fn(),
      orderBy: jest.fn(),
      startAfter: jest.fn(),
      limit: jest.fn(),
      get: jest.fn(async () => ({ docs: documents })),
      count: jest.fn(() => ({ get: countGet })),
    }
    query.where.mockReturnValue(query)
    query.orderBy.mockReturnValue(query)
    query.startAfter.mockReturnValue(query)
    query.limit.mockReturnValue(query)
    const collection = {
      where: jest.fn(() => query),
      doc: jest.fn(() => ({ get: jest.fn(async () => ({ exists: false })) })),
    }
    ;(getFirestore as jest.Mock).mockReturnValue({ collection: jest.fn(() => collection) })

    const response = await getHistory(makeRequest('http://localhost/api/credits/history?limit=2'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(query.limit).toHaveBeenCalledWith(3)
    expect(payload).toMatchObject({
      success: true,
      hasMore: true,
      nextCursor: 'transaction-2',
      total: 3,
      transactions: [
        {
          id: 'transaction-3',
          userId: 'session-user',
          type: 'purchase',
          description: 'Achat de crédits',
          createdAt: '2026-07-18T12:00:00.000Z',
        },
        {
          id: 'transaction-2',
          type: 'spend',
          description: 'Remonter une annonce',
        },
      ],
    })
  })

  it('accepte le jeton Firebase comme repli et refuse une requête anonyme', async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)
    const emptyQuery = {
      where: jest.fn(),
      orderBy: jest.fn(),
      limit: jest.fn(),
      get: jest.fn(async () => ({ docs: [] })),
      count: jest.fn(() => ({ get: jest.fn(async () => ({ data: () => ({ count: 0 }) })) })),
    }
    emptyQuery.where.mockReturnValue(emptyQuery)
    emptyQuery.orderBy.mockReturnValue(emptyQuery)
    emptyQuery.limit.mockReturnValue(emptyQuery)
    const collection = { where: jest.fn(() => emptyQuery), doc: jest.fn() }
    ;(getFirestore as jest.Mock).mockReturnValue({ collection: jest.fn(() => collection) })

    const authorized = await getHistory(makeRequest(
      'http://localhost/api/credits/history',
      'Bearer valid-token',
    ))
    const unauthorized = await getPacks(makeRequest('http://localhost/api/credits/packs'))

    expect(authorized.status).toBe(200)
    expect(adminAuth.verifyIdToken).toHaveBeenCalledWith('valid-token')
    expect(unauthorized.status).toBe(401)
  })
})
