let POST: typeof import('@/app/api/webhooks/airtel/route').POST
let GET: typeof import('@/app/api/webhooks/airtel/route').GET

let currentDb: any

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }) }))
jest.mock('@/firebase/admin', () => ({ adminApp: { name: 'admin' } }))
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => currentDb,
  FieldValue: { serverTimestamp: () => 'SERVER_TS' },
}))

function request(payload: unknown, headers: Record<string, string> = {}) {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return {
    headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null },
    text: async () => JSON.stringify(payload),
  } as any
}

function makeDb({ txExists = true, txData = { userId: 'u1', credits: 20 }, userExists = true, userCredits = 5 } = {}) {
  const userRef = { id: 'user-ref' }
  const txUpdate = jest.fn(async () => undefined)
  const txDocRef = { id: 'tx-1', get: async () => ({ exists: txExists, data: () => txData }), update: txUpdate }
  const userSnapshot = userExists
    ? { empty: false, docs: [{ ref: userRef, data: () => ({ credits: userCredits }) }] }
    : { empty: true, docs: [] }
  const transaction = { update: jest.fn() }
  const db = {
    collection: jest.fn((name: string) => ({
      doc: () => (name === 'credit_transactions' ? txDocRef : userRef),
      where: () => ({ limit: () => ({ get: async () => userSnapshot }) }),
    })),
    runTransaction: jest.fn(async (fn: any) => fn(transaction)),
  }
  return { db, txUpdate, transaction, userRef }
}

function airtelPayload(status: string) {
  return {
    transaction: { airtel_money_id: 'am-1', id: 'tx-1', message: 'ok', status, amount: 1000, currency: 'XAF' },
    reference: 'ref-1',
    timestamp: '2026-07-22T10:00:00Z',
  }
}

describe('/api/webhooks/airtel', () => {
  beforeAll(async () => {
    const mod = await import('@/app/api/webhooks/airtel/route')
    POST = mod.POST
    GET = mod.GET
  })
  beforeEach(() => {
    jest.clearAllMocks()
    currentDb = makeDb().db
  })

  it('GET expose un statut operationnel', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ message: expect.stringContaining('Airtel') })
  })

  it('renvoie 404 quand la transaction est introuvable', async () => {
    currentDb = makeDb({ txExists: false }).db
    const response = await POST(request(airtelPayload('SUCCESS')))
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: 'Transaction introuvable' })
  })

  it('cree les credits et marque la transaction reussie sur SUCCESS', async () => {
    const built = makeDb({ userCredits: 5, txData: { userId: 'u1', credits: 20 } })
    currentDb = built.db
    const response = await POST(request(airtelPayload('SUCCESS')))
    expect(response.status).toBe(200)
    // credits credites: 5 + 20 = 25 dans la transaction atomique
    expect(built.transaction.update).toHaveBeenCalledWith(built.userRef, expect.objectContaining({ credits: 25 }))
    // statut de la transaction passe a success avec l identifiant Airtel
    expect(built.txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success', airtelMoneyId: 'am-1' }),
    )
  })

  it('marque la transaction en echec sur FAILED sans crediter', async () => {
    const built = makeDb()
    currentDb = built.db
    const response = await POST(request(airtelPayload('FAILED')))
    expect(response.status).toBe(200)
    expect(built.transaction.update).not.toHaveBeenCalled()
    expect(built.txUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
  })

  it('traduit un JSON invalide en 500', async () => {
    const response = await POST({ headers: { get: () => '' }, text: async () => 'not-json' } as any)
    expect(response.status).toBe(500)
  })
})
