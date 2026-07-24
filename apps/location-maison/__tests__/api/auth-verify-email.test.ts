export {};
let GET: typeof import('@/app/api/auth/verify-email/route').GET
let POST: typeof import('@/app/api/auth/verify-email/route').POST

const adminAuth = {
  getUser: jest.fn(),
  updateUser: jest.fn(async () => undefined),
}

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
    redirect: (url: URL | string) => ({
      status: 307,
      headers: new Headers({ location: url.toString() }),
    }),
  },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }) }))
jest.mock('@/firebase/admin', () => ({ adminAuth }))

function getRequest(query: string) {
  const url = `http://localhost/api/auth/verify-email?${query}`
  return { url, nextUrl: new URL(url) } as any
}
function postRequest(body: unknown) {
  return { url: 'http://localhost/api/auth/verify-email', json: async () => body } as any
}
const notFound = () => Object.assign(new Error('nf'), { code: 'auth/user-not-found' })

describe('/api/auth/verify-email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('rejette une absence d uid', async () => {
      const response = await GET(getRequest('expires=999'))
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
    })

    it('redirige un lien expire', async () => {
      const response = await GET(getRequest(`uid=u1&expires=${Date.now() - 1000}`))
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/email-verification-expired')
      expect(adminAuth.getUser).not.toHaveBeenCalled()
    })

    it('redirige un lien sans expiration comme expire', async () => {
      const response = await GET(getRequest('uid=u1'))
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/email-verification-expired')
    })

    it('redirige vers deja-verifie quand l email est deja verifie', async () => {
      adminAuth.getUser.mockResolvedValueOnce({ uid: 'u1', emailVerified: true })
      const response = await GET(getRequest(`uid=u1&expires=${Date.now() + 100000}`))
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/email-already-verified')
      expect(adminAuth.updateUser).not.toHaveBeenCalled()
    })

    it('marque verifie et redirige vers succes', async () => {
      adminAuth.getUser.mockResolvedValueOnce({ uid: 'u1', emailVerified: false })
      const response = await GET(getRequest(`uid=u1&expires=${Date.now() + 100000}`))
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/email-verification-success')
      expect(adminAuth.updateUser).toHaveBeenCalledWith('u1', { emailVerified: true })
    })

    it('traduit un utilisateur inconnu en 404', async () => {
      adminAuth.getUser.mockRejectedValueOnce(notFound())
      const response = await GET(getRequest(`uid=u1&expires=${Date.now() + 100000}`))
      expect(response.status).toBe(404)
      expect(await response.json()).toMatchObject({ error: { code: 'USER_NOT_FOUND' } })
    })
  })

  describe('POST', () => {
    it('rejette un uid manquant', async () => {
      const response = await POST(postRequest({}))
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
    })

    it('renvoie deja-verifie sans ecriture', async () => {
      adminAuth.getUser.mockResolvedValueOnce({ uid: 'u1', emailVerified: true })
      const response = await POST(postRequest({ uid: 'u1' }))
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ success: true, alreadyVerified: true })
      expect(adminAuth.updateUser).not.toHaveBeenCalled()
    })

    it('marque verifie quand ce ne l etait pas', async () => {
      adminAuth.getUser.mockResolvedValueOnce({ uid: 'u1', emailVerified: false })
      const response = await POST(postRequest({ uid: 'u1' }))
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ success: true, alreadyVerified: false })
      expect(adminAuth.updateUser).toHaveBeenCalledWith('u1', { emailVerified: true })
    })

    it('traduit un utilisateur inconnu en 404', async () => {
      adminAuth.getUser.mockRejectedValueOnce(notFound())
      const response = await POST(postRequest({ uid: 'u1' }))
      expect(response.status).toBe(404)
      expect(await response.json()).toMatchObject({ error: { code: 'USER_NOT_FOUND' } })
    })
  })
})

beforeAll(async () => {
  const mod = await import('@/app/api/auth/verify-email/route')
  GET = mod.GET
  POST = mod.POST
})
