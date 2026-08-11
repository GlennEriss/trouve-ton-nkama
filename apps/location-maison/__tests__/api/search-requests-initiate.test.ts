export {};
let POST: typeof import('@/app/api/search-requests/initiate/route').POST

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}))
jest.mock('@/constantes/search-requests', () => ({ SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH: 1000 }))

const request = (body: unknown) => ({ json: async () => body } as any)

const validRequest = {
  typeProperty: 'Home',
  transactionType: 'FOR_RENT',
  province: 'Estuaire',
  city: 'Libreville',
  neighborhood: 'Akanda',
  budgetMinXaf: 100_000,
  budgetMaxXaf: 250_000,
  description: 'Cherche un trois pieces proche du centre-ville.',
  whatsappContact: '074000000',
  payerPhone: '074000000',
  network: 'AM',
  boostRequested: true,
}

describe('/api/search-requests/initiate', () => {
  const originalEnv = process.env

  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/search-requests/initiate/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, FIREBASE_PROJECT_ID: 'proj', VERCEL: '1' }
    global.fetch = jest.fn()
  })
  afterAll(() => {
    process.env = originalEnv
  })

  describe('validation du corps', () => {
    it.each([
      ['un type de bien inconnu', { typeProperty: 'Chateau' }],
      ['un type de transaction inconnu', { transactionType: 'FOR_LEASE' }],
      ['une province vide', { province: '   ' }],
      ['une ville vide', { city: '' }],
      ['une description trop courte', { description: 'court' }],
      ['une description au-dela de la limite', { description: 'a'.repeat(1001) }],
      ['un budget maximum nul', { budgetMaxXaf: 0 }],
      ['un budget minimum negatif', { budgetMinXaf: -1 }],
      ['un reseau inconnu', { network: 'ORANGE' }],
      ['un contact whatsapp trop court', { whatsappContact: '074' }],
      ['un boost non booleen', { boostRequested: 'oui' }],
    ])('rejette %s sans appeler la Cloud Function', async (_label, override) => {
      const response = await POST(request({ ...validRequest, ...override }))
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ success: false, error: 'invalid_body' })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('rejette un budget minimum superieur au maximum', async () => {
      const response = await POST(request({ ...validRequest, budgetMinXaf: 900_000, budgetMaxXaf: 100_000 }))
      expect(response.status).toBe(400)
      expect(fetch).not.toHaveBeenCalled()
    })

    it('accepte une demande sans quartier, champ optionnel', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, transactionId: 'tx-1' }),
      })
      const { neighborhood, ...withoutNeighborhood } = validRequest
      const response = await POST(request(withoutNeighborhood))
      expect(response.status).toBe(200)
    })
  })

  describe('proxy vers la Cloud Function', () => {
    it('transmet la demande validee et relaie la reponse', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, transactionId: 'tx-1' }),
      })

      const response = await POST(request(validRequest))

      expect(fetch).toHaveBeenCalledWith(
        'https://us-central1-proj.cloudfunctions.net/initiateSearchRequestPayment',
        expect.objectContaining({ method: 'POST' }),
      )
      expect(await response.json()).toEqual({ success: true, transactionId: 'tx-1' })
    })

    it('vise l emulateur local hors plateforme d hebergement', async () => {
      process.env = { ...originalEnv, FIREBASE_PROJECT_ID: 'proj' }
      delete process.env.VERCEL
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, transactionId: 'tx-1' }),
      })

      await POST(request(validRequest))

      expect(fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:5001/proj/us-central1/initiateSearchRequestPayment',
        expect.anything(),
      )
    })

    it('relaie le refus de la Cloud Function avec son statut et son motif', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ message: 'Trop de demandes', error: 'rate_limited' }),
      })

      const response = await POST(request(validRequest))

      expect(response.status).toBe(429)
      expect(await response.json()).toMatchObject({
        success: false,
        message: 'Trop de demandes',
        error: 'rate_limited',
      })
    })

    it('fournit un message par defaut quand la Cloud Function refuse sans corps lisible', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('not json')
        },
      })

      const response = await POST(request(validRequest))

      expect(response.status).toBe(500)
      expect(await response.json()).toMatchObject({
        success: false,
        message: "Erreur lors de l'initiation du paiement",
      })
    })

    it('traduit une panne reseau en 500', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('network down'))

      const response = await POST(request(validRequest))

      expect(response.status).toBe(500)
      expect(await response.json()).toMatchObject({ success: false, message: 'Erreur interne du serveur' })
    })

    it('traduit un corps JSON illisible en 500', async () => {
      const response = await POST({ json: async () => { throw new Error('bad json') } } as any)
      expect(response.status).toBe(500)
    })
  })
})
