export {};
let GET: typeof import('@/app/api/auth/password-reset/route').GET
let POST: typeof import('@/app/api/auth/password-reset/route').POST

const adminAuth = { getUserByEmail: jest.fn(async () => ({ uid: 'u1' })) }
const dispatch = jest.fn(async () => undefined)

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
    redirect: (url: URL | string) => ({ status: 307, headers: new Headers({ location: url.toString() }) }),
  },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }) }))
jest.mock('@/firebase/admin', () => ({ adminAuth }))
jest.mock('@/features/users/account-activity-notifications', () => ({
  accountActivityNotificationServerService: { dispatch },
}))

function getRequest(query: string) {
  const url = `http://localhost/api/auth/password-reset?${query}`
  return { url, nextUrl: new URL(url) } as any
}
function postRequest(body: unknown) {
  return { json: async () => body } as any
}

describe('/api/auth/password-reset', () => {
  const originalEnv = process.env
  beforeAll(async () => {
    const mod = await import('@/app/api/auth/password-reset/route')
    GET = mod.GET
    POST = mod.POST
  })
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NEXT_PUBLIC_FIREBASE_API_KEY: 'fb-key' }
    global.fetch = jest.fn()
  })
  afterAll(() => {
    process.env = originalEnv
  })

  describe('GET', () => {
    it('redirige vers l echec sans oobCode', async () => {
      const response = await GET(getRequest(''))
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/password-reset-failure')
    })

    it('redirige vers la page de reset avec oobCode', async () => {
      const response = await GET(getRequest('oobCode=abc'))
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/password-reset?oobCode=abc')
    })
  })

  describe('POST', () => {
    it('exige newPassword et oobCode', async () => {
      const response = await POST(postRequest({ newPassword: 'secret' }))
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
    })

    it('reinitialise le mot de passe et notifie l activite du compte', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ email: 'user@x.ga' }) })
      const response = await POST(postRequest({ newPassword: 'NewSecret1', oobCode: 'valid' }))
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ success: true })
      expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ uid: 'u1', eventType: 'ACCOUNT_PASSWORD_CHANGED' }))
    })

    it('reste un succes meme si la notification d activite echoue', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ email: 'user@x.ga' }) })
      dispatch.mockRejectedValueOnce(new Error('notif down'))
      const response = await POST(postRequest({ newPassword: 'NewSecret1', oobCode: 'valid' }))
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ success: true })
    })

    it.each([
      ['EXPIRED_OOB_CODE', 'EXPIRED_OOB_CODE'],
      ['INVALID_OOB_CODE', 'INVALID_OOB_CODE'],
      ['WEAK_PASSWORD', 'WEAK_PASSWORD'],
    ])('traduit une erreur Firebase %s en 400', async (fbMessage, code) => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ error: { message: fbMessage } }) })
      const response = await POST(postRequest({ newPassword: 'x', oobCode: 'code' }))
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: { code } })
    })

    it('traduit une erreur inconnue en 500', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ error: { message: 'SOMETHING_ELSE' } }) })
      const response = await POST(postRequest({ newPassword: 'x', oobCode: 'code' }))
      expect(response.status).toBe(500)
      expect(await response.json()).toMatchObject({ error: { code: 'PASSWORD_RESET_FAILED' } })
    })
  })
})
