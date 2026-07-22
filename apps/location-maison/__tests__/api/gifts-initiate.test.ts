export {};
let POST: typeof import('@/app/api/gifts/initiate/route').POST

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
jest.mock('@/constantes/gifts', () => ({ GIFT_MIN_AMOUNT_XAF: 100, GIFT_MAX_AMOUNT_XAF: 1000000, GIFT_MESSAGE_MAX_LENGTH: 200 }))

const request = (body: unknown) => ({ json: async () => body } as any)
const validGift = { reelId: 'r1', amount: 500, phoneNumber: '074000000', network: 'AM' }

describe('/api/gifts/initiate', () => {
  const originalEnv = process.env
  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/gifts/initiate/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, FIREBASE_PROJECT_ID: 'proj', VERCEL: '1' }
    global.fetch = jest.fn()
  })
  afterAll(() => {
    process.env = originalEnv
  })

  it('rejette un corps invalide (montant sous le minimum)', async () => {
    const response = await POST(request({ ...validGift, amount: 10 }))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ success: false, error: 'invalid_body' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejette quand ni reelId ni propertyId (ou les deux)', async () => {
    const none = await POST(request({ amount: 500, phoneNumber: '074000000', network: 'AM' }))
    expect(none.status).toBe(400)
    const both = await POST(request({ reelId: 'r1', propertyId: 'p1', amount: 500, phoneNumber: '074000000', network: 'AM' }))
    expect(both.status).toBe(400)
  })

  it('proxifie vers la cloud function et relaie le succes', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, transactionId: 'gift-1' }) })
    const response = await POST(request(validGift))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, transactionId: 'gift-1' })
    const [url, init] = (fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('initiateGiftPayment')
    expect(JSON.parse(init.body)).toMatchObject({ reelId: 'r1', amount: 500, network: 'AM' })
  })

  it('relaie le statut d erreur de la cloud function (anti-spam 429)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ message: 'Trop de dons', error: 'rate_limited' }) })
    const response = await POST(request(validGift))
    expect(response.status).toBe(429)
    expect(await response.json()).toMatchObject({ success: false, message: 'Trop de dons', error: 'rate_limited' })
  })

  it('traduit une exception en 500', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const response = await POST(request(validGift))
    expect(response.status).toBe(500)
  })
})
