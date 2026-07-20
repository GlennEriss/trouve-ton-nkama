import { adminAuth } from '@/firebase/admin'
import { auth } from '@/next-auth/auth'

let postGenerateToken: typeof import('@/app/api/generate-token/route').POST

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => payload,
    }),
  },
}))

jest.mock('@/next-auth/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/firebase/admin', () => ({
  adminAuth: {
    createCustomToken: jest.fn(),
  },
}))

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  )

  return {
    headers: {
      get: (name: string) => normalizedHeaders.get(name.toLowerCase()) ?? null,
    },
    json: async () => body,
  } as any
}

describe('/api/generate-token', () => {
  beforeAll(async () => {
    ;({ POST: postGenerateToken } = await import('@/app/api/generate-token/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'session-user' } })
    ;(adminAuth.createCustomToken as jest.Mock).mockResolvedValue('firebase-custom-token')
  })

  it('refuse un visiteur sans session', async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const response = await postGenerateToken(makeRequest(
      { uid: 'victim-user' },
      { 'content-type': 'application/json', 'content-length': '21' },
    ))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({ error: { code: 'UNAUTHENTICATED' } })
    expect(adminAuth.createCustomToken).not.toHaveBeenCalled()
  })

  it("refuse de générer le jeton d'un autre utilisateur", async () => {
    const response = await postGenerateToken(makeRequest(
      { uid: 'other-user' },
      { 'content-type': 'application/json', 'content-length': '20' },
    ))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toMatchObject({ error: { code: 'FORBIDDEN' } })
    expect(adminAuth.createCustomToken).not.toHaveBeenCalled()
  })

  it('génère uniquement le jeton lié à la session', async () => {
    const response = await postGenerateToken(makeRequest(
      { uid: 'session-user' },
      { 'content-type': 'application/json', 'content-length': '22' },
    ))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ token: 'firebase-custom-token' })
    expect(adminAuth.createCustomToken).toHaveBeenCalledTimes(1)
    expect(adminAuth.createCustomToken).toHaveBeenCalledWith('session-user')
  })
})
