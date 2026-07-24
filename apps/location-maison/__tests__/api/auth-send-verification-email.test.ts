export {};
let POST: typeof import('@/app/api/auth/send-verification-email/route').POST

const adminAuth = { getUser: jest.fn(), getUserByEmail: jest.fn() }
const sendEmail = jest.fn(async () => ({ simulated: true, messageId: 'msg-1', accepted: ['to@x.ga'], rejected: [] }))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@react-email/render', () => ({ render: jest.fn(async () => '<html>email</html>') }))
jest.mock('@/emails/EmailVerification', () => ({ __esModule: true, default: () => null }))
jest.mock('@/services/email.service', () => ({
  emailService: { sendEmail },
  EmailService: { getDefaultFromAddress: () => 'no-reply@tonnkama.com' },
}))
jest.mock('@/emails/index', () => ({
  EmailService: { generateEmailVerificationProps: (name: string, email: string, link: string) => ({ name, email, link }) },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }) }))
jest.mock('@/firebase/admin', () => ({ adminAuth }))

function request(body: unknown) {
  return { json: async () => body } as any
}
const notFound = () => Object.assign(new Error('nf'), { code: 'auth/user-not-found' })

describe('/api/auth/send-verification-email', () => {
  const originalEnv = process.env
  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/auth/send-verification-email/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NEXT_PUBLIC_HOST: 'https://tonnkama.com' }
  })
  afterAll(() => {
    process.env = originalEnv
  })

  it('exige un email ou un uid', async () => {
    const response = await POST(request({}))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('ne renvoie pas d email si deja verifie', async () => {
    adminAuth.getUserByEmail.mockResolvedValueOnce({ uid: 'u1', email: 'a@x.ga', emailVerified: true })
    const response = await POST(request({ email: 'a@x.ga' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: false, alreadyVerified: true })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('envoie l email de verification pour un compte non verifie', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true, writable: true })
    adminAuth.getUser.mockResolvedValueOnce({ uid: 'u9', email: 'b@x.ga', emailVerified: false, displayName: 'Jean Dupont' })
    const response = await POST(request({ uid: 'u9' }))
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toMatchObject({ success: true })
    expect(payload.verificationLink).toContain('/api/auth/verify-email?uid=u9')
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const [emailData] = sendEmail.mock.calls[0] as unknown[]
    expect(emailData).toMatchObject({ to: 'b@x.ga', from: 'no-reply@tonnkama.com' })
  })

  it('traduit un utilisateur inconnu en 404', async () => {
    adminAuth.getUserByEmail.mockRejectedValueOnce(notFound())
    const response = await POST(request({ email: 'ghost@x.ga' }))
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: { code: 'USER_NOT_FOUND' } })
  })
})
