export {};
let POST: typeof import('@/app/api/users/become-announcer/route').POST

let authResult: any
const becomeAnnouncer = jest.fn()

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
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }) }))
jest.mock('@/features/users/become-announcer/services', () => ({
  BecomeAnnouncerErrorCode: { UNAUTHENTICATED: 'UNAUTHENTICATED' },
}))
jest.mock('@/features/users/become-announcer/services/become-announcer-server.service', () => ({
  becomeAnnouncerServerService: { becomeAnnouncer },
}))

const request = (body: unknown) => ({ json: async () => body } as any)

describe('/api/users/become-announcer', () => {
  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/users/become-announcer/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    authResult = { user: { uid: 'u1' } }
  })

  it('exige une session authentifiee', async () => {
    authResult = null
    const response = await POST(request({ acceptAnnouncerTerms: true }))
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } })
    expect(becomeAnnouncer).not.toHaveBeenCalled()
  })

  it('active le role annonceur et renvoie les roles', async () => {
    becomeAnnouncer.mockResolvedValueOnce({ success: true, code: 'ROLE_GRANTED', roles: ['user', 'announcer'], metadata: { first: true } })
    const response = await POST(request({ acceptAnnouncerTerms: true, source: 'onboarding' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, code: 'ROLE_GRANTED', roles: ['user', 'announcer'] })
    expect(becomeAnnouncer).toHaveBeenCalledWith({ uid: 'u1', acceptAnnouncerTerms: true, source: 'onboarding' })
  })

  it('relaie l erreur metier du service', async () => {
    becomeAnnouncer.mockResolvedValueOnce({ success: false, error: { status: 409, code: 'TERMS_NOT_ACCEPTED', message: 'CGU requises' } })
    const response = await POST(request({ acceptAnnouncerTerms: false }))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ error: { code: 'TERMS_NOT_ACCEPTED' } })
  })

  it('traduit une exception en 500', async () => {
    becomeAnnouncer.mockRejectedValueOnce(new Error('service down'))
    const response = await POST(request({ acceptAnnouncerTerms: true }))
    expect(response.status).toBe(500)
  })
})
