import type { Page } from '@playwright/test'

const EMPTY_ALGOLIA_RESULT = {
  hits: [],
  nbHits: 0,
  page: 0,
  nbPages: 0,
  hitsPerPage: 20,
  processingTimeMS: 1,
  query: '',
  params: '',
  exhaustiveNbHits: true,
  exhaustiveFacetsCount: true,
  facets: {},
}

export async function mockDiscoverySurfaces(page: Page) {
  await page.route('**/api/property/promoted', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        featuredProperties: [],
        trendingProperties: [],
        boostProperties: [],
      }),
    })
  })

  await page.route('**/api/property/list**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ properties: [], lastDoc: null }),
    })
  })

  await page.route('**/api/property/count/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        byType: {},
        byProvince: {},
        generatedAt: '2026-07-18T00:00:00.000Z',
      }),
    })
  })

  await page.route('**/api/location/provinces', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ provinces: [] }),
    })
  })

  await page.route('**/api/advertising/active**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ creative: null, creatives: [] }),
    })
  })

  await page.route('**/api/advertising/track', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })

  await page.route(/https:\/\/[^/]*algolia(?:search)?\.net\/.*/, async (route) => {
    let requestCount = 1
    try {
      const payload = route.request().postDataJSON() as { requests?: unknown[] }
      requestCount = Math.max(payload.requests?.length ?? 1, 1)
    } catch {
      requestCount = 1
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: Array.from({ length: requestCount }, () => EMPTY_ALGOLIA_RESULT),
      }),
    })
  })
}

const FAKE_REELS = [
  {
    id: 'reel-lot5c-1',
    propertyId: null,
    createdBy: 'announcer-e2e',
    videoUrl: 'https://example.com/reel-lot5c-1.mp4',
    thumbnailUrl: '',
    contact: '+24166545430',
    description: 'Studio lumineux proche des commerces.',
    moderationStatus: 'APPROVED',
    processingStatus: 'ready',
    viewCount: 12,
    likeCount: 2,
    shareCount: 1,
    giftCount: 0,
    giftTotalAmount: 0,
  },
]

export async function mockReelsSurface(page: Page) {
  await page.route('**/api/reels/feed**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reels: FAKE_REELS, nextCursor: null }),
    })
  })

  await page.route('**/api/reels/*/statistics/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    })
  })
}
