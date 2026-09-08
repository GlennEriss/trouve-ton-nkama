export {};
let POST: typeof import('@/app/api/search-requests/mobile-create/route').POST

const adminAuth = { verifyIdToken: jest.fn(async () => ({ uid: 'mobile-user-1' })) }
const setMock = jest.fn()
const docMock = jest.fn(() => ({ id: 'sr-generated-id', set: setMock }))
const collectionMock = jest.fn(() => ({ doc: docMock }))
const getFirestoreMock = jest.fn(() => ({ collection: collectionMock }))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => payload,
    }),
  },
}))
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}))
jest.mock('@/firebase/admin', () => ({ adminAuth }))
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => getFirestoreMock(),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

function request(body: unknown, headers: Record<string, string> = {}) {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return {
    headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null },
    json: async () => body,
  } as never
}

const authed = { authorization: 'Bearer valid-token' }
const validBody = {
  typeProperty: 'Home',
  transactionType: 'FOR_RENT',
  province: 'Estuaire',
  city: 'Libreville',
  budgetMinXaf: 0,
  budgetMaxXaf: 150000,
  description: 'Recherche une maison 2 chambres proche du centre-ville.',
  whatsappContact: '062459646',
}

describe('/api/search-requests/mobile-create', () => {
  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/search-requests/mobile-create/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'mobile-user-1' } as never)
  })

  it('exige un token Bearer', async () => {
    const response = await POST(request(validBody))
    expect(response.status).toBe(401)
    expect(setMock).not.toHaveBeenCalled()
  })

  it('rejette un token invalide', async () => {
    adminAuth.verifyIdToken.mockRejectedValueOnce(new Error('invalid token'))
    const response = await POST(request(validBody, authed))
    expect(response.status).toBe(401)
    expect(setMock).not.toHaveBeenCalled()
  })

  it('rejette un corps invalide (budget min > budget max)', async () => {
    const response = await POST(request({ ...validBody, budgetMinXaf: 200000, budgetMaxXaf: 100000 }, authed))
    expect(response.status).toBe(400)
    expect(setMock).not.toHaveBeenCalled()
  })

  it('crée la demande gratuitement, en attente de modération, avec le contact normalisé', async () => {
    const response = await POST(request(validBody, authed))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, id: 'sr-generated-id' })

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'mobile',
        createdByUid: 'mobile-user-1',
        paymentStatus: 'not_required',
        amountPaidXaf: 0,
        moderationStatus: 'PENDING',
        state: 'IN_PROGRESS',
        whatsappContact: '+24162459646',
        secondaryContact: null,
      }),
    )
  })

  it('normalise aussi le contact secondaire quand il est fourni', async () => {
    await POST(request({ ...validBody, secondaryContact: '077890742' }, authed))
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ secondaryContact: '+24177890742' }),
    )
  })
})
