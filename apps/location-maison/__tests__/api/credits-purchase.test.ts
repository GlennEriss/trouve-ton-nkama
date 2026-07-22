export {};
let POST: typeof import('@/app/api/credits/purchase/route').POST

const adminAuth = { verifyIdToken: jest.fn(async () => ({ uid: 'u1' })) }

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
jest.mock('@/lib/observability/request-context', () => ({
  createRequestLogContext: () => ({ requestId: 'req-1' }),
  attachRequestId: (res: any) => res,
}))
jest.mock('@/firebase/admin', () => ({ adminAuth }))

function request(body: unknown, headers: Record<string, string> = {}) {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return { headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null }, json: async () => body } as any
}
const authed = { authorization: 'Bearer valid-token' }
const validBody = { packId: 'starter', phoneNumber: '074000000', network: 'AM' }

describe('/api/credits/purchase', () => {
  const originalEnv = process.env
  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/credits/purchase/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, FIREBASE_PROJECT_ID: 'proj', VERCEL: '1' }
    global.fetch = jest.fn()
  })
  afterAll(() => {
    process.env = originalEnv
  })

  it('exige un token Bearer', async () => {
    const response = await POST(request(validBody))
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ success: false })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('exige packId et numero de telephone', async () => {
    const response = await POST(request({ packId: 'starter' }, authed))
    expect(response.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('relaie le resultat de la cloud function en cas de succes', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { success: true, transactionId: 'tx-9', checkoutUrl: 'https://pay/x' } }),
    })
    const response = await POST(request(validBody, authed))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, transactionId: 'tx-9', checkoutUrl: 'https://pay/x' })
    const [url, init] = (fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('initiatePurchase')
    expect(JSON.parse(init.body)).toMatchObject({ data: { packId: 'starter', phoneNumber: '074000000', network: 'AM' } })
  })

  it('traduit un echec de la cloud function en 500', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({ error: 'provider down' }) })
    const response = await POST(request(validBody, authed))
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ success: false, message: 'provider down' })
  })

  it('traduit un token expire en 401', async () => {
    adminAuth.verifyIdToken.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/id-token-expired' }))
    const response = await POST(request(validBody, authed))
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ message: 'Session expirée, veuillez vous reconnecter' })
  })

  it('traduit un token invalide en 401', async () => {
    adminAuth.verifyIdToken.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/invalid-id-token' }))
    const response = await POST(request(validBody, authed))
    expect(response.status).toBe(401)
  })
})
