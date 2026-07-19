let getHealth: typeof import('@/app/api/health/route').GET

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: new Headers(init?.headers),
      json: async () => payload,
    }),
  },
}))

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

describe('/api/health', () => {
  const originalEnv = process.env

  beforeAll(async () => {
    ;({ GET: getHealth } = await import('@/app/api/health/route'))
  })

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'location-maison-dev',
      NEXTAUTH_SECRET: 'test-secret',
      CACHE_BACKEND: 'firestore',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('confirme la disponibilite sans interroger Firebase', async () => {
    const response = await getHealth()

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'ok' })
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0')
  })

  it('signale une configuration Redis incomplete sans exposer les noms au client', async () => {
    process.env.CACHE_BACKEND = 'redis'
    Reflect.deleteProperty(process.env, 'UPSTASH_REDIS_REST_URL')
    Reflect.deleteProperty(process.env, 'UPSTASH_REDIS_REST_TOKEN')

    const response = await getHealth()
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({ status: 'degraded' })
    expect(JSON.stringify(payload)).not.toContain('UPSTASH')
  })
})
