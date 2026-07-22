export {};
let POST: typeof import('@/app/api/auth/send-password-reset-email/route').POST

const adminAuth = { getUserByEmail: jest.fn(), generatePasswordResetLink: jest.fn() }
const sendEmail = jest.fn(async () => ({ simulated: true, messageId: 'm1', accepted: ['to@x.ga'], rejected: [] }))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@react-email/render', () => ({ render: jest.fn(async () => '<html>reset</html>') }))
jest.mock('@/emails/PasswordReset', () => ({ __esModule: true, default: () => null }))
jest.mock('@/services/email.service', () => ({
  emailService: { sendEmail },
  EmailService: { getDefaultFromAddress: () => 'no-reply@tonnkama.com' },
}))
jest.mock('@/emails/index', () => ({
  EmailService: { generatePasswordResetProps: (name: string, email: string, link: string) => ({ name, email, link }) },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }) }))
jest.mock('@/firebase/admin', () => ({ adminAuth }))

const request = (body: unknown) => ({ json: async () => body } as any)

describe('/api/auth/send-password-reset-email', () => {
  const originalEnv = process.env
  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/auth/send-password-reset-email/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NEXT_PUBLIC_HOST: 'https://tonnkama.com' }
    adminAuth.getUserByEmail.mockResolvedValue({ uid: 'u1', email: 'a@x.ga', displayName: 'Jean Dupont' })
    adminAuth.generatePasswordResetLink.mockResolvedValue('https://fb/reset?oobCode=OOB123')
  })
  afterAll(() => {
    process.env = originalEnv
  })

  it('exige un email', async () => {
    const response = await POST(request({}))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('envoie l email de reinitialisation avec un lien base sur l oobCode', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true, writable: true })
    const response = await POST(request({ email: 'a@x.ga' }))
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toMatchObject({ success: true })
    expect(payload.resetLink).toContain('oobCode=OOB123')
    const [emailData] = sendEmail.mock.calls[0] as unknown[]
    expect(emailData).toMatchObject({ to: 'a@x.ga', from: 'no-reply@tonnkama.com' })
  })

  it('renvoie 500 si le lien Firebase ne contient pas d oobCode', async () => {
    adminAuth.generatePasswordResetLink.mockResolvedValueOnce('https://fb/reset?foo=bar')
    const response = await POST(request({ email: 'a@x.ga' }))
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ error: { code: 'PASSWORD_RESET_LINK_GENERATION_FAILED' } })
  })

  it('traduit un depassement de limite en 429', async () => {
    adminAuth.generatePasswordResetLink.mockRejectedValueOnce(new Error('RESET_PASSWORD_EXCEED_LIMIT'))
    const response = await POST(request({ email: 'a@x.ga' }))
    expect(response.status).toBe(429)
    expect(await response.json()).toMatchObject({ error: { code: 'RATE_LIMIT_EXCEEDED' } })
  })

  it('traduit un compte introuvable en 404', async () => {
    adminAuth.getUserByEmail.mockRejectedValueOnce(Object.assign(new Error('nf'), { code: 'auth/user-not-found' }))
    const response = await POST(request({ email: 'ghost@x.ga' }))
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: { code: 'USER_NOT_FOUND' } })
  })
})
