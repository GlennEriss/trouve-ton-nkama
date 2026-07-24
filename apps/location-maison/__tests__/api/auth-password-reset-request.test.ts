export {};
let POST: typeof import('@/app/api/auth/password-reset-request/route').POST

const adminAuth = { getUserByEmail: jest.fn(), generatePasswordResetLink: jest.fn() }

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
jest.mock('@/firebase/admin', () => ({ adminAuth }))

const request = (body: unknown) => ({ json: async () => body } as any)

describe('/api/auth/password-reset-request', () => {
  const originalEnv = process.env
  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/auth/password-reset-request/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NEXT_PUBLIC_HOST: 'https://tonnkama.com' }
    adminAuth.getUserByEmail.mockResolvedValue({ uid: 'u1', email: 'a@x.ga' })
    adminAuth.generatePasswordResetLink.mockResolvedValue('https://fb/reset?oobCode=OOB999')
  })
  afterAll(() => {
    process.env = originalEnv
  })

  it('exige un email', async () => {
    const response = await POST(request({}))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })

  it('genere un lien de reinitialisation personnalise', async () => {
    const response = await POST(request({ email: 'a@x.ga' }))
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toMatchObject({ success: true })
    expect(payload.resetLink).toBe('https://tonnkama.com/api/auth/password-reset?oobCode=OOB999')
    expect(adminAuth.generatePasswordResetLink).toHaveBeenCalledWith(
      'a@x.ga',
      expect.objectContaining({ handleCodeInApp: false }),
    )
  })

  it('renvoie 500 si le lien Firebase ne contient pas d oobCode', async () => {
    adminAuth.generatePasswordResetLink.mockResolvedValueOnce('https://fb/reset?foo=bar')
    const response = await POST(request({ email: 'a@x.ga' }))
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ error: { code: 'PASSWORD_RESET_LINK_GENERATION_FAILED' } })
  })

  it('traduit un compte introuvable en 404', async () => {
    adminAuth.getUserByEmail.mockRejectedValueOnce(Object.assign(new Error('nf'), { code: 'auth/user-not-found' }))
    const response = await POST(request({ email: 'ghost@x.ga' }))
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: { code: 'USER_NOT_FOUND' } })
  })
})
