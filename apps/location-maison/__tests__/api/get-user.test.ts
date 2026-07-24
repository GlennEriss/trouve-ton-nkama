export {};
let POST: typeof import('@/app/api/get-user/route').POST

const adminAuth = { getUser: jest.fn() }

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: jest.fn(), error: jest.fn() }) }))
jest.mock('@/firebase/admin', () => ({ adminAuth }))

const request = (body: unknown) => ({ json: async () => body } as any)

describe('/api/get-user', () => {
  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/get-user/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('exige un uid', async () => {
    const response = await POST(request({}))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
    expect(adminAuth.getUser).not.toHaveBeenCalled()
  })

  it('renvoie l utilisateur Firebase correspondant a l uid', async () => {
    adminAuth.getUser.mockResolvedValueOnce({ uid: 'u1', email: 'a@x.ga' })
    const response = await POST(request({ uid: 'u1' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ uid: 'u1', email: 'a@x.ga' })
  })

  it('traduit un utilisateur inconnu en 404', async () => {
    adminAuth.getUser.mockRejectedValueOnce(Object.assign(new Error('nf'), { code: 'auth/user-not-found' }))
    const response = await POST(request({ uid: 'ghost' }))
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: { code: 'USER_NOT_FOUND' } })
  })
})
