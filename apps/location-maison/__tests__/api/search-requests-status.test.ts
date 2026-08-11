export {};
let GET: typeof import('@/app/api/search-requests/[transactionId]/status/route').GET

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
jest.mock('@/constantes/firebase-collection-name', () => ({
  __esModule: true,
  default: { search_requests: 'search_requests' },
}))

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

describe('/api/search-requests/[transactionId]/status', () => {
  beforeAll(async () => {
    ;({ GET } = await import('@/app/api/search-requests/[transactionId]/status/route'))
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

  // Contrat de confidentialite : la demande n'est pas encore moderee, donc le
  // telephone du visiteur et sa description ne doivent jamais fuiter ici.
  it('n expose que le statut et la raison d echec, aucun autre champ du document', async () => {
    getFirestore.mockReturnValue(
      makeDb({
        exists: true,
        data: {
          paymentStatus: 'failed',
          failureReason: 'Solde insuffisant',
          whatsappContact: '074000000',
          payerPhone: '074000000',
          description: 'Cherche un 3 pieces',
        },
      }),
    )
    const response = await GET({} as any, paramsFor('tx-1'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'failed', failureReason: 'Solde insuffisant' })
  })

  it('remonte le statut confirme', async () => {
    getFirestore.mockReturnValue(makeDb({ exists: true, data: { paymentStatus: 'confirmed' } }))
    const response = await GET({} as any, paramsFor('tx-2'))
    expect(await response.json()).toEqual({ status: 'confirmed', failureReason: null })
  })

  it('considere une transaction sans statut comme en attente de confirmation', async () => {
    getFirestore.mockReturnValue(makeDb({ exists: true, data: {} }))
    const response = await GET({} as any, paramsFor('tx-3'))
    expect(await response.json()).toEqual({ status: 'pending_confirmation', failureReason: null })
  })

  it('tolere un document vide', async () => {
    getFirestore.mockReturnValue(makeDb({ exists: true, data: undefined }))
    const response = await GET({} as any, paramsFor('tx-4'))
    expect(await response.json()).toEqual({ status: 'pending_confirmation', failureReason: null })
  })

  it('traduit une panne Firestore en 500', async () => {
    getFirestore.mockImplementation(() => {
      throw new Error('firestore down')
    })
    const response = await GET({} as any, paramsFor('tx-1'))
    expect(response.status).toBe(500)
  })
})
