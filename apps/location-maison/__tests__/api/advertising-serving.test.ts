const getActiveCampaignForPlacement = jest.fn()
const getActiveCampaignsForPlacement = jest.fn()
const incrementCampaignMetric = jest.fn()

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))

jest.mock('@/db/ad-campaign.db', () => ({
  getActiveCampaignForPlacement: (...args: unknown[]) => getActiveCampaignForPlacement(...args),
  getActiveCampaignsForPlacement: (...args: unknown[]) => getActiveCampaignsForPlacement(...args),
  incrementCampaignMetric: (...args: unknown[]) => incrementCampaignMetric(...args),
}))

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

let getActiveAds: typeof import('@/app/api/advertising/active/route').GET
let trackAd: typeof import('@/app/api/advertising/track/route').POST

const creative = {
  campaignId: 'campaign-6b',
  placement: 'reels_infeed' as const,
  imageURL: 'https://example.com/campaign-6b.jpg',
  headline: 'Campagne 6B',
  ctaUrl: 'https://example.com/offre',
}

function activeRequest(url: string) {
  return { url } as Request
}

function trackingRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
  } as Request
}

describe('Lot 6B - API de diffusion publicitaire', () => {
  beforeAll(async () => {
    ;({ GET: getActiveAds } = await import('@/app/api/advertising/active/route'))
    ;({ POST: trackAd } = await import('@/app/api/advertising/track/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('refuse un emplacement inconnu', async () => {
    const response = await getActiveAds(activeRequest(
      'http://localhost/api/advertising/active?placement=sidebar',
    ))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    })
    expect(getActiveCampaignForPlacement).not.toHaveBeenCalled()
  })

  it('sert une campagne ciblee sans mettre en cache la rotation', async () => {
    getActiveCampaignForPlacement.mockResolvedValue(creative)

    const response = await getActiveAds(activeRequest(
      'http://localhost/api/advertising/active?placement=reels_infeed&province=Estuaire&city=Libreville',
    ))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ creative })
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0')
    expect(getActiveCampaignForPlacement).toHaveBeenCalledWith('reels_infeed', {
      province: 'Estuaire',
      city: 'Libreville',
    })
  })

  it('sert toutes les campagnes du hero avec un cache court', async () => {
    getActiveCampaignsForPlacement.mockResolvedValue([creative])

    const response = await getActiveAds(activeRequest(
      'http://localhost/api/advertising/active?placement=home&all=1',
    ))

    expect(await response.json()).toEqual({ creative, creatives: [creative] })
    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=60, stale-while-revalidate=120',
    )
    expect(getActiveCampaignsForPlacement).toHaveBeenCalledWith('home', {
      province: null,
      city: null,
    })
  })

  it.each([
    ['impression', 'impressions'],
    ['click', 'clicks'],
  ])('convertit %s vers la metrique %s', async (event, metric) => {
    incrementCampaignMetric.mockResolvedValue(true)

    const response = await trackAd(trackingRequest({
      campaignId: creative.campaignId,
      event,
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(incrementCampaignMetric).toHaveBeenCalledWith(creative.campaignId, metric)
  })

  it('refuse les charges de suivi invalides', async () => {
    const response = await trackAd(trackingRequest({
      campaignId: creative.campaignId,
      event: 'share',
    }))

    expect(response.status).toBe(400)
    expect(incrementCampaignMetric).not.toHaveBeenCalled()
  })

  it('ne valide pas le suivi d une campagne inexistante', async () => {
    incrementCampaignMetric.mockResolvedValue(false)

    const response = await trackAd(trackingRequest({
      campaignId: 'missing-campaign',
      event: 'impression',
    }))
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'CAMPAIGN_NOT_FOUND' },
    })
  })
})
