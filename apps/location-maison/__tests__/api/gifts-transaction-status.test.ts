export {};
let GET: typeof import('@/app/api/gifts/[transactionId]/status/route').GET

const getFirestore = jest.fn()

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn() }) }))
jest.mock('@/firebase/admin', () => ({ adminApp: { name: 'admin' } }))
jest.mock('firebase-admin/firestore', () => ({ getFirestore }))
jest.mock('@/constantes/firebase-collection-name', () => ({ __esModule: true, default: { gift_transactions: 'gift_transactions' } }))

function makeDb(snapshot: { exists: boolean; data?: Record<string, unknown> }) {
  return {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(async () => ({ exists: snapshot.exists, data: () => snapshot.data })),
      })),
    })),
  }
}
const paramsFor = (transactionId: string) => ({ params: Promise.resolve({ transactionId }) })

describe('/api/gifts/[transactionId]/status', () => {
  beforeAll(async () => {
    ;({ GET } = await import('@/app/api/gifts/[transactionId]/status/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('exige un transactionId', async () => {
    const response = await GET({} as any, paramsFor(''))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })

  it('renvoie 404 quand la transaction est introuvable', async () => {
    getFirestore.mockReturnValue(makeDb({ exists: false }))
    const response = await GET({} as any, paramsFor('tx-missing'))
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } })
  })

  it('renvoie uniquement le statut et la raison d echec, sans autre champ', async () => {
    getFirestore.mockReturnValue(
      makeDb({ exists: true, data: { status: 'failed', failureReason: 'Solde insuffisant', phoneNumber: '074000000', amount: 500 } }),
    )
    const response = await GET({} as any, paramsFor('tx-1'))
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toEqual({ status: 'failed', failureReason: 'Solde insuffisant' })
  })

  it('applique les valeurs par defaut quand le statut est absent', async () => {
    getFirestore.mockReturnValue(makeDb({ exists: true, data: {} }))
    const response = await GET({} as any, paramsFor('tx-2'))
    expect(await response.json()).toEqual({ status: 'pending', failureReason: null })
  })

  it('traduit une panne Firestore en 500', async () => {
    getFirestore.mockImplementation(() => {
      throw new Error('firestore down')
    })
    const response = await GET({} as any, paramsFor('tx-1'))
    expect(response.status).toBe(500)
  })
})
