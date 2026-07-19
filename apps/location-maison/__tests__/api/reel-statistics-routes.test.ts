import { trackReelLike, trackReelShare, trackReelView } from '@/db/reel-statistics.db'

let postView: typeof import('@/app/api/reels/[reelId]/statistics/view/route').POST
let postLike: typeof import('@/app/api/reels/[reelId]/statistics/like/route').POST
let postShare: typeof import('@/app/api/reels/[reelId]/statistics/share/route').POST

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

jest.mock('@/db/reel-statistics.db', () => ({
  trackReelView: jest.fn(),
  trackReelLike: jest.fn(),
  trackReelShare: jest.fn(),
}))

jest.mock('@/lib/server/statistics-actor', () => ({
  resolveStatisticsActor: jest.fn(() => 'actor-lot6c'),
}))

function makeRequest(body: Record<string, unknown> = {}, requestId?: string) {
  return {
    method: 'POST',
    headers: {
      get: (name: string) => name.toLowerCase() === 'x-request-id' ? requestId ?? null : null,
    },
    json: async () => body,
  } as any
}

const params = (reelId: string) => ({
  params: Promise.resolve({ reelId }),
})

describe('/api/reels/[reelId]/statistics', () => {
  beforeAll(async () => {
    ;({ POST: postView } = await import('@/app/api/reels/[reelId]/statistics/view/route'))
    ;({ POST: postLike } = await import('@/app/api/reels/[reelId]/statistics/like/route'))
    ;({ POST: postShare } = await import('@/app/api/reels/[reelId]/statistics/share/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(trackReelView as jest.Mock).mockResolvedValue('tracked')
    ;(trackReelLike as jest.Mock).mockResolvedValue('tracked')
    ;(trackReelShare as jest.Mock).mockResolvedValue('tracked')
  })

  it('track une vue de reel', async () => {
    const response = await postView(makeRequest({}, 'request-lot6d-stats'), params('reel-1'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toBe('request-lot6d-stats')
    expect(payload).toMatchObject({ success: true, deduplicated: false })
    expect(trackReelView).toHaveBeenCalledWith('reel-1', 'actor-lot6c')
  })

  it('refuse une vue sans reelId', async () => {
    const response = await postView(makeRequest(), params(''))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
      },
    })
    expect(trackReelView).not.toHaveBeenCalled()
  })

  it('track un like et un unlike explicites', async () => {
    const likeResponse = await postLike(makeRequest({ liked: true }), params('reel-1'))
    const unlikeResponse = await postLike(makeRequest({ liked: false }), params('reel-1'))

    expect(likeResponse.status).toBe(200)
    expect(unlikeResponse.status).toBe(200)
    expect(trackReelLike).toHaveBeenNthCalledWith(1, 'reel-1', true, 'actor-lot6c')
    expect(trackReelLike).toHaveBeenNthCalledWith(2, 'reel-1', false, 'actor-lot6c')
  })

  it('refuse un like sans booleen liked', async () => {
    const response = await postLike(makeRequest({ liked: 'true' }), params('reel-1'))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
      },
    })
    expect(trackReelLike).not.toHaveBeenCalled()
  })

  it('normalise la cible de partage autorisee', async () => {
    const response = await postShare(makeRequest({ target: 'X' }), params('reel-1'))

    expect(response.status).toBe(200)
    expect(trackReelShare).toHaveBeenCalledWith('reel-1', 'x', 'actor-lot6c')
  })

  it('ignore une cible de partage non reconnue sans bloquer le compteur global', async () => {
    const response = await postShare(makeRequest({ target: 'linkedin' }), params('reel-1'))

    expect(response.status).toBe(200)
    expect(trackReelShare).toHaveBeenCalledWith('reel-1', undefined, 'actor-lot6c')
  })

  it('accepte un evenement duplique sans reincrementer', async () => {
    ;(trackReelView as jest.Mock).mockResolvedValue('duplicate')

    const response = await postView(makeRequest(), params('reel-1'))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      success: true,
      deduplicated: true,
    })
  })

  it('renvoie une erreur quand la mise a jour echoue', async () => {
    ;(trackReelShare as jest.Mock).mockResolvedValue('failed')

    const response = await postShare(makeRequest({ target: 'whatsapp' }), params('reel-missing'))
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'TRACK_SHARE_FAILED',
      },
    })
  })

  it('renvoie 404 quand le reel n existe pas', async () => {
    ;(trackReelLike as jest.Mock).mockResolvedValue('not-found')

    const response = await postLike(makeRequest({ liked: true }), params('reel-missing'))

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: 'REEL_NOT_FOUND' },
    })
  })
})
