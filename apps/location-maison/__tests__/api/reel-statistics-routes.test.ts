import { trackReelLike, trackReelShare, trackReelView } from '@/db/reel-statistics.db'

let postView: typeof import('@/app/api/reels/[reelId]/statistics/view/route').POST
let postLike: typeof import('@/app/api/reels/[reelId]/statistics/like/route').POST
let postShare: typeof import('@/app/api/reels/[reelId]/statistics/share/route').POST

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
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

function makeRequest(body: Record<string, unknown> = {}) {
  return {
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
    ;(trackReelView as jest.Mock).mockResolvedValue(true)
    ;(trackReelLike as jest.Mock).mockResolvedValue(true)
    ;(trackReelShare as jest.Mock).mockResolvedValue(true)
  })

  it('track une vue de reel', async () => {
    const response = await postView(makeRequest(), params('reel-1'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true })
    expect(trackReelView).toHaveBeenCalledWith('reel-1')
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
    expect(trackReelLike).toHaveBeenNthCalledWith(1, 'reel-1', true)
    expect(trackReelLike).toHaveBeenNthCalledWith(2, 'reel-1', false)
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
    expect(trackReelShare).toHaveBeenCalledWith('reel-1', 'x')
  })

  it('ignore une cible de partage non reconnue sans bloquer le compteur global', async () => {
    const response = await postShare(makeRequest({ target: 'linkedin' }), params('reel-1'))

    expect(response.status).toBe(200)
    expect(trackReelShare).toHaveBeenCalledWith('reel-1', undefined)
  })

  it('renvoie une erreur quand le compteur refuse la mise a jour', async () => {
    ;(trackReelShare as jest.Mock).mockResolvedValue(false)

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
})
