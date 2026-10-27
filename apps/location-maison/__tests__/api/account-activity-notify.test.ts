export {};
let POST: typeof import('@/app/api/users/account-activity/notify/route').POST

let authResult: any
const dispatch = jest.fn()
const verifyIdToken = jest.fn()
jest.mock('@/firebase/admin', () => ({ adminAuth: { verifyIdToken } }))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/next-auth/auth', () => ({ auth: jest.fn(async () => authResult) }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: jest.fn(), error: jest.fn() }) }))
jest.mock('@/features/users/account-activity-notifications', () => ({
  accountActivityNotificationServerService: { dispatch },
}))

const request = (body: unknown, authorization?: string) => ({ json: async () => body, headers: new Headers(authorization ? { authorization } : {}) } as any)

describe('/api/users/account-activity/notify', () => {
  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/users/account-activity/notify/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    authResult = { user: { uid: 'u1' } }
    verifyIdToken.mockReset()
  })

  it('exige une session', async () => {
    authResult = null
    const response = await POST(request({ eventType: 'ACCOUNT_PASSWORD_CHANGED' }))
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } })
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('rejette un type d evenement inconnu', async () => {
    const response = await POST(request({ eventType: 'NOT_A_REAL_EVENT' }))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'INVALID_EVENT_TYPE' } })
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('valide le token mobile et ignore tout uid fourni par le client', async () => {
    authResult = null
    verifyIdToken.mockResolvedValue({ uid: 'mobile-user' })
    const response = await POST(request({ uid: 'victim', eventType: 'ACCOUNT_PROVIDER_LINKED' }, 'Bearer firebase-token'))
    expect(response.status).toBe(200)
    expect(verifyIdToken).toHaveBeenCalledWith('firebase-token')
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ uid: 'mobile-user' }))
  })

  it.each(['Bearer expired', 'Bearer ', 'Basic invalid'])('refuse le token invalide %s', async authorization => {
    authResult = null
    verifyIdToken.mockRejectedValue(new Error('invalid token'))
    const response = await POST(request({ eventType: 'ACCOUNT_PROVIDER_LINKED' }, authorization))
    expect(response.status).toBe(401)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('dispatch un evenement valide avec eventId et contexte', async () => {
    dispatch.mockResolvedValueOnce({ delivered: true })
    const response = await POST(
      request({ eventType: 'ACCOUNT_PHONE_VERIFIED', eventId: 'evt-1', context: { source: 'profile' } }),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, data: { delivered: true } })
    expect(dispatch).toHaveBeenCalledWith({
      uid: 'u1',
      eventType: 'ACCOUNT_PHONE_VERIFIED',
      eventId: 'evt-1',
      context: { source: 'profile' },
    })
  })

  it('ignore un contexte de type tableau', async () => {
    dispatch.mockResolvedValueOnce({ delivered: true })
    await POST(request({ eventType: 'ACCOUNT_PROFILE_UPDATED', context: ['bad'] }))
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ context: undefined }))
  })

  it('traduit une exception en 500', async () => {
    dispatch.mockRejectedValueOnce(new Error('dispatch down'))
    const response = await POST(request({ eventType: 'ACCOUNT_EMAIL_CHANGED' }))
    expect(response.status).toBe(500)
  })
})
