let POST: typeof import('@/app/api/ai/assistant/chat/route').POST

// --- Holders pilotables par test ---
let currentDb: any
let authResult: any
let geminiText: string
let geminiThrows: Error | null

const adminAuth = { verifyIdToken: jest.fn() }
const generateContent = jest.fn(async () => {
  if (geminiThrows) throw geminiThrows
  return { response: { text: () => geminiText } }
})

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn(), warn: jest.fn() }) }))
jest.mock('@/next-auth/auth', () => ({ auth: jest.fn(async () => authResult) }))
jest.mock('@/services/ai-prompts.service', () => ({
  __esModule: true,
  default: { buildContextualPrompt: () => 'CONTEXTUAL_PROMPT', getSystemPrompt: () => 'SYSTEM_PROMPT' },
}))
jest.mock('@/lib/ai/gemini-model', () => ({ resolveGeminiModel: () => 'gemini-test' }))
jest.mock('@/constantes/firebase-collection-name', () => ({
  __esModule: true,
  default: { users: 'users', credit_transactions: 'credit_transactions' },
}))
jest.mock('@/firebase/admin', () => ({ adminAuth, adminApp: {} }))
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => currentDb,
  FieldValue: { serverTimestamp: () => 'SERVER_TS' },
}))
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent }
    }
  },
}))

function request(body: unknown, headers: Record<string, string> = {}) {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return {
    headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null },
    json: async () => body,
  } as any
}

function makeDb({ userExists = true, credits = 10 }: { userExists?: boolean; credits?: number } = {}) {
  const userRef = { id: 'user-ref' }
  const snapshot = userExists
    ? { empty: false, docs: [{ ref: userRef, data: () => ({ uid: 'user-1', credits }) }] }
    : { empty: true, docs: [] }
  const txRef = { id: 'tx-generated' }
  const transaction = {
    get: jest.fn(async () => ({ data: () => ({ credits }) })),
    update: jest.fn(),
    set: jest.fn(),
  }
  const db = {
    collection: jest.fn(() => ({
      where: () => ({ limit: () => ({ get: async () => snapshot }) }),
      doc: () => txRef,
    })),
    runTransaction: jest.fn(async (fn: any) => fn(transaction)),
  }
  return { db, transaction, userRef, txRef }
}

const validBody = { message: 'Bonjour assistant' }

describe('/api/ai/assistant/chat', () => {
  const originalEnv = process.env

  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/ai/assistant/chat/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, GEMINI_API_KEY: 'gemini-secret' }
    authResult = { user: { uid: 'user-1', email: 'u@test.ga' } }
    geminiText = 'Reponse IA utile'
    geminiThrows = null
    currentDb = makeDb().db
  })
  afterAll(() => {
    process.env = originalEnv
  })

  it('rejette un corps invalide', async () => {
    const response = await POST(request({ message: 'x' }))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })

  it('exige une authentification', async () => {
    authResult = null
    const response = await POST(request(validBody))
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } })
  })

  it('renvoie 404 quand le profil est introuvable', async () => {
    currentDb = makeDb({ userExists: false }).db
    const response = await POST(request(validBody))
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: { code: 'USER_NOT_FOUND' } })
  })

  it('refuse quand les credits sont insuffisants', async () => {
    currentDb = makeDb({ credits: 0 }).db
    const response = await POST(request(validBody))
    expect(response.status).toBe(402)
    expect(await response.json()).toMatchObject({ error: { code: 'INSUFFICIENT_CREDITS' } })
  })

  it('genere la reponse, debite un credit et enregistre la transaction', async () => {
    const built = makeDb({ credits: 5 })
    currentDb = built.db
    const response = await POST(request({ message: 'Aide-moi a rediger une annonce' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      success: true,
      response: 'Reponse IA utile',
      creditsRemaining: 4,
      transactionId: 'tx-generated',
    })
    expect(built.transaction.update).toHaveBeenCalledWith(
      built.userRef,
      expect.objectContaining({ credits: 4, updatedAt: 'SERVER_TS' }),
    )
    expect(built.transaction.set).toHaveBeenCalledWith(
      built.txRef,
      expect.objectContaining({ type: 'spend', credits: -1, status: 'success', service: 'Assistant IA' }),
    )
  })

  it('remonte une configuration IA manquante en 500', async () => {
    delete process.env.GEMINI_API_KEY
    const response = await POST(request(validBody))
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ error: { code: 'AI_CONFIGURATION_ERROR' } })
  })

  it('traduit une panne du fournisseur IA en 502', async () => {
    geminiThrows = new Error('gemini down')
    const response = await POST(request(validBody))
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ error: { code: 'AI_PROVIDER_ERROR' } })
  })

  it('traduit un token expire en 401 via le header Bearer', async () => {
    authResult = null
    adminAuth.verifyIdToken.mockRejectedValueOnce(Object.assign(new Error('expired'), { code: 'auth/id-token-expired' }))
    const response = await POST(request(validBody, { authorization: 'Bearer stale-token' }))
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ error: { code: 'AUTH_TOKEN_EXPIRED' } })
  })
})
