import firebaseCollectionNames from '@/constantes/firebase-collection-name'
import { adminAuth } from '@/firebase/admin'
import { getDynamicTagNamesServer } from '@/lib/tags/dynamic-tags.server'
import { getFirestore } from 'firebase-admin/firestore'

let postChat: typeof import('@/app/api/ai-search/chat/route').POST

const generateContentMock = jest.fn()
const loggerWarnMock = jest.fn()
const loggerErrorMock = jest.fn()

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => payload,
    }),
  },
}))

jest.mock('@/firebase/admin', () => ({
  adminApp: { name: 'ai-search-test' },
  adminAuth: { verifyIdToken: jest.fn() },
}))

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
  FieldValue: {
    serverTimestamp: jest.fn(() => ({ __type: 'serverTimestamp' })),
  },
}))

jest.mock('@/lib/tags/dynamic-tags.server', () => ({
  getDynamicTagNamesServer: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: (...args: unknown[]) => loggerWarnMock(...args),
    error: (...args: unknown[]) => loggerErrorMock(...args),
  }),
}))

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({ generateContent: generateContentMock })),
  })),
}))

type FakeRef = {
  __collection: string
  id: string
  get?: jest.Mock
}

type DbOptions = {
  user?: Record<string, unknown> | null
  session?: Record<string, unknown> | null
  freshUserCredits?: number
  freshSession?: Record<string, unknown> | null
}

function snapshot(data: Record<string, unknown> | null, ref?: FakeRef) {
  return {
    exists: Boolean(data),
    empty: !data,
    data: () => data,
    ref,
  }
}

function makeDb(options: DbOptions = {}) {
  const userData = options.user === undefined ? { uid: 'user-ai-9c', credits: 10 } : options.user
  const sessionData = options.session ?? null
  const userRef: FakeRef = { __collection: firebaseCollectionNames.users, id: 'user-doc-ai-9c' }
  const sessionRef: FakeRef = { __collection: firebaseCollectionNames.ai_search_sessions, id: 'conversation-ai-9c' }
  sessionRef.get = jest.fn(async () => snapshot(sessionData, sessionRef))
  const creditRef: FakeRef = { __collection: firebaseCollectionNames.credit_transactions, id: 'credit-ai-9c' }
  const addTurn = jest.fn(async () => ({ id: 'turn-ai-9c' }))

  const transaction = {
    get: jest.fn(async (ref: FakeRef) => {
      if (ref === userRef) {
        const credits = options.freshUserCredits ?? Number(userData?.credits ?? 0)
        return snapshot(userData ? { ...userData, credits } : null, userRef)
      }
      if (ref === sessionRef) {
        return snapshot(options.freshSession === undefined ? sessionData : options.freshSession, sessionRef)
      }
      return snapshot(null, ref)
    }),
    update: jest.fn(),
    set: jest.fn(),
  }

  const db = {
    collection: jest.fn((name: string) => {
      if (name === firebaseCollectionNames.users) {
        return {
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(async () => ({
                empty: !userData,
                docs: userData ? [{ ...snapshot(userData, userRef), ref: userRef }] : [],
              })),
            })),
          })),
        }
      }
      if (name === firebaseCollectionNames.ai_search_sessions) {
        return { doc: jest.fn(() => sessionRef) }
      }
      if (name === firebaseCollectionNames.credit_transactions) {
        return { doc: jest.fn(() => creditRef) }
      }
      if (name === firebaseCollectionNames.ai_search_turns) {
        return { add: addTurn }
      }
      throw new Error(`Unexpected collection: ${name}`)
    }),
    runTransaction: jest.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  }

  return { db, transaction, addTurn, userRef, sessionRef, creditRef }
}

function request(body: Record<string, unknown>, token: string | null = 'valid-token') {
  return {
    url: 'https://www.tonnkama.com/api/ai-search/chat',
    headers: {
      get: (name: string) => name.toLowerCase() === 'authorization' && token ? `Bearer ${token}` : null,
    },
    json: async () => body,
  } as any
}

const validBody = {
  conversationId: 'conversation-ai-9c',
  message: 'Je cherche une maison à Akanda avec 3 chambres max 500000 FCFA',
  entrypointSource: 'search_cta' as const,
}

function algoliaResponse(data: Record<string, unknown>, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
    text: async () => ok ? '' : 'Algolia unavailable',
  } as Response
}

function analyticsResponse(ok = true) {
  return {
    ok,
    status: ok ? 200 : 503,
    text: async () => 'analytics unavailable',
  } as Response
}

describe('/api/ai-search/chat', () => {
  beforeAll(async () => {
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID = 'ALGOLIA_APP'
    process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY = 'algolia-key'
    process.env.ALGOLIA_INDEX_NAME = 'properties-test'
    process.env.GEMINI_API_KEY = 'gemini-test-key'
    process.env.AI_SEARCH_INPUT_TOKEN_COST_PER_1K_FCFA = '2'
    process.env.AI_SEARCH_OUTPUT_TOKEN_COST_PER_1K_FCFA = '4'
    process.env.AI_SEARCH_SEARCH_CALL_COST_FCFA = '5'
    ;({ POST: postChat } = await import('@/app/api/ai-search/chat/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'user-ai-9c' })
    ;(getDynamicTagNamesServer as jest.Mock).mockResolvedValue(['Meublé', 'Piscine', 'Parking'])
    generateContentMock.mockResolvedValue({ response: { text: () => 'Voici les logements les plus adaptés à vos critères.' } })
  })

  afterAll(() => {
    delete process.env.GEMINI_API_KEY
  })

  it('refuse les requêtes anonymes et les corps invalides', async () => {
    const unauthorized = await postChat(request(validBody, null))
    expect(unauthorized.status).toBe(401)
    expect(await unauthorized.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } })

    const invalid = await postChat(request({ conversationId: 'short', message: 'x' }))
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR', details: { issues: expect.any(Array) } } })
  })

  it('traduit les jetons expirés et refuse un profil absent', async () => {
    ;(adminAuth.verifyIdToken as jest.Mock).mockRejectedValueOnce({ code: 'auth/id-token-expired' })
    const expired = await postChat(request(validBody))
    expect(expired.status).toBe(401)
    expect(await expired.json()).toMatchObject({ error: { code: 'AUTH_TOKEN_EXPIRED' } })

    ;(adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'user-ai-9c' })
    const { db } = makeDb({ user: null })
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    const missing = await postChat(request(validBody))
    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({ error: { code: 'USER_NOT_FOUND' } })
  })

  it('répond à une salutation sans lancer Algolia ni débiter de crédit', async () => {
    const { db, transaction, addTurn } = makeDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    global.fetch = jest.fn()

    const response = await postChat(request({
      conversationId: 'conversation-greeting-9c',
      message: 'Bonjour !',
      currentFilters: {},
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.search).toMatchObject({ ran: false, nbHits: 0, resultStatus: 'none' })
    expect(payload.billing).toMatchObject({ creditsDebited: 0, creditsRemaining: 10 })
    expect(payload.assistantMessage).toContain('Donnez-moi un budget')
    expect(global.fetch).not.toHaveBeenCalled()
    expect(transaction.update).not.toHaveBeenCalled()
    expect(addTurn).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: null, searchCallsDelta: 0 }))
  })

  it('extrait les critères, interroge Algolia, débite une fois et transmet les analytics', async () => {
    const { db, transaction, addTurn, userRef, creditRef } = makeDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    const hits = [
      { objectID: 'p1', title: 'Maison Akanda', city: 'Akanda', province: 'Estuaire', street: 'Angondjé', price: 450000, nbrRooms: 3 },
      { objectID: 'p2', title: 'Maison voisine', city: 'Akanda', province: 'Estuaire', price: 480000, nbrRooms: 3 },
      { objectID: 'p3', title: 'Villa Akanda', city: 'Akanda', province: 'Estuaire', price: 500000, nbrRooms: 3 },
      { objectID: 'p4', title: 'Logement Akanda', city: 'Akanda', province: 'Estuaire', price: 490000, nbrRooms: 3 },
      { objectID: 'p5', title: 'Maison Akanda 5', city: 'Akanda', province: 'Estuaire', price: 400000, nbrRooms: 3 },
    ]
    global.fetch = jest.fn()
      .mockResolvedValueOnce(algoliaResponse({ hits, nbHits: 5, queryID: 'query-ai-9c' }))
      .mockResolvedValueOnce(analyticsResponse(true))

    const response = await postChat(request({
      ...validBody,
      message: 'Je cherche une maison meublé à Akanda avec 3 chambres max 500000 FCFA',
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.search.ran).toBe(true)
    expect(payload.search.appliedFilters).toMatchObject({
      maxPrice: 500000,
      minNbrRooms: 3,
      maxNbrRooms: 3,
      typeProperty: ['Home'],
      tags: ['Meublé'],
    })
    expect(payload.search.filters).toContain('state:"IN_PROGRESS"')
    expect(payload.search.filters).toContain('price <= 500000')
    expect(payload.search).toMatchObject({ nbHits: 5, queryId: 'query-ai-9c', resultStatus: 'enough' })
    expect(payload.billing).toMatchObject({ creditsDebited: 1, creditsRemaining: 9, transactionId: 'credit-ai-9c' })
    expect(payload.finance.revenueEstimatedFcfa).toBe(250)
    expect(transaction.update).toHaveBeenCalledWith(userRef, expect.objectContaining({ credits: 9 }))
    expect(transaction.set).toHaveBeenCalledWith(creditRef, expect.objectContaining({ credits: -1, service: 'Assistant IA Recherche' }))
    expect(addTurn).toHaveBeenCalledWith(expect.objectContaining({ resultStatus: 'enough', nbHits: 5 }))
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(generateContentMock).toHaveBeenCalled()
  })

  it('signale explicitement les alternatives lorsqu aucune annonce exacte ne correspond', async () => {
    const { db } = makeDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    global.fetch = jest.fn()
      .mockResolvedValueOnce(algoliaResponse({
        hits: [{ objectID: 'alternative', title: 'Studio Owendo', city: 'Owendo', price: 300000, nbrRooms: 2 }],
        nbHits: 1,
      }))
      .mockResolvedValueOnce(analyticsResponse(false))

    const response = await postChat(request({
      conversationId: 'conversation-alternative-9c',
      message: 'Trouve une maison',
      currentFilters: {
        query: 'Akanda',
        minNbrRooms: 3,
        maxNbrRooms: 3,
        maxPrice: 300000,
      },
    }))
    const payload = await response.json()

    expect(payload.search.resultStatus).toBe('few')
    expect(payload.assistantMessage).toContain('aucun logement correspondant exactement')
    expect(payload.assistantMessage).toContain('1 alternative')
    expect(payload.suggestedActions[0]).toMatchObject({ type: 'APPLY_FILTERS', payload: { maxPrice: 330000 } })
    expect(loggerWarnMock).toHaveBeenCalledWith('Search-with-IA analytics forwarding rejected', expect.any(Object))
    expect(generateContentMock).not.toHaveBeenCalled()
  })

  it('élargit un budget existant et conserve les filtres lors d un suivi', async () => {
    const { db } = makeDb({ session: { searchCallsTotal: 1, creditsDebitedTotal: 1 } })
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    global.fetch = jest.fn()
      .mockResolvedValueOnce(algoliaResponse({ hits: [], nbHits: 0 }))
      .mockResolvedValueOnce(analyticsResponse(true))
    generateContentMock.mockResolvedValueOnce({ response: { text: () => '' } })

    const response = await postChat(request({
      conversationId: 'conversation-expand-9c',
      message: 'Oui, élargis un peu',
      currentFilters: { maxPrice: 100000, minNbrRooms: 2, maxNbrRooms: 2, status: ['FOR_RENT'] },
    }))
    const payload = await response.json()

    expect(payload.search.appliedFilters.maxPrice).toBe(110000)
    expect(payload.search.appliedFilters.status).toEqual(['FOR_RENT'])
    expect(payload.assistantMessage).toContain("J'ai élargi le budget max à 110")
    expect(payload.suggestedActions).toHaveLength(2)
    expect(payload.billing.creditsDebited).toBe(0)
  })

  it('bloque le hors sujet et les réponses Gemini dangereuses', async () => {
    const { db } = makeDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    global.fetch = jest.fn()

    const outOfScope = await postChat(request({
      conversationId: 'conversation-scope-9c',
      message: 'Comment pirater un compte politique ?',
      forceSearch: true,
    }))
    const scopePayload = await outOfScope.json()
    expect(scopePayload.search.ran).toBe(false)
    expect(scopePayload.assistantMessage).toContain('uniquement vous aider pour la recherche de logements')

    const secondDb = makeDb()
    ;(getFirestore as jest.Mock).mockReturnValue(secondDb.db)
    generateContentMock.mockResolvedValueOnce({ response: { text: () => 'Réponse idiot et agressive' } })
    global.fetch = jest.fn()
      .mockResolvedValueOnce(algoliaResponse({ hits: [{ objectID: 'p1', title: 'Maison', price: 1 }], nbHits: 1 }))
      .mockResolvedValueOnce(analyticsResponse(true))
    const unsafe = await postChat(request({
      conversationId: 'conversation-unsafe-9c',
      message: 'Trouve une maison',
    }))
    expect((await unsafe.json()).assistantMessage).toContain("J'ai trouvé 1 logement")
  })

  it('refuse les crédits insuffisants avant recherche et pendant la transaction', async () => {
    const previewDb = makeDb({ user: { uid: 'user-ai-9c', credits: 0 } })
    ;(getFirestore as jest.Mock).mockReturnValue(previewDb.db)
    global.fetch = jest.fn()
    const preview = await postChat(request(validBody))
    expect(preview.status).toBe(402)
    expect(await preview.json()).toMatchObject({ error: { code: 'INSUFFICIENT_CREDITS' } })
    expect(global.fetch).not.toHaveBeenCalled()

    const raceDb = makeDb({ freshUserCredits: 0 })
    ;(getFirestore as jest.Mock).mockReturnValue(raceDb.db)
    global.fetch = jest.fn().mockResolvedValueOnce(algoliaResponse({ hits: [], nbHits: 0 }))
    const race = await postChat(request(validBody))
    expect(race.status).toBe(402)
    expect(await race.json()).toMatchObject({ error: { code: 'INSUFFICIENT_CREDITS' } })
  })

  it('traduit une configuration Algolia absente et une panne du moteur', async () => {
    const { db } = makeDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_ALGOLIA_APP_ID')
    const missing = await postChat(request(validBody))
    expect(missing.status).toBe(500)
    expect(await missing.json()).toMatchObject({ error: { code: 'ALGOLIA_CONFIGURATION_ERROR' } })
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID = appId

    const secondDb = makeDb()
    ;(getFirestore as jest.Mock).mockReturnValue(secondDb.db)
    global.fetch = jest.fn().mockResolvedValueOnce(algoliaResponse({}, false, 503))
    const failed = await postChat(request(validBody))
    expect(failed.status).toBe(502)
    expect(await failed.json()).toMatchObject({ error: { code: 'ALGOLIA_SEARCH_FAILED' } })
    expect(loggerErrorMock).toHaveBeenCalledWith('Algolia query failed', expect.objectContaining({ status: 503 }))
  })
})
