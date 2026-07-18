import type { Page, Route } from '@playwright/test'

export const fakeCampaigns = [
  {
    id: 'campaign-e2e-1',
    title: 'Promo Akanda',
    status: 'active',
    placements: ['search_infeed', 'reels_infeed'],
    imageURL: '/og-image.png',
    startDate: '2026-07-18T08:00:00.000Z',
    endDate: '2026-08-17T08:00:00.000Z',
    metrics: { impressions: 1234, clicks: 56 },
    creditsUsed: 70,
  },
  {
    id: 'campaign-e2e-2',
    title: 'Studio Nzeng-Ayong',
    status: 'ended',
    placements: ['property_detail'],
    imageURL: '/home.png',
    startDate: '2026-06-01T08:00:00.000Z',
    endDate: '2026-06-15T08:00:00.000Z',
    metrics: { impressions: 420, clicks: 12 },
    creditsUsed: 35,
  },
]

export type AdvertisingPostCapture = {
  headers: Record<string, string>
  body: any
}

export async function fulfillCampaignsRoute(
  route: Route,
  captures: AdvertisingPostCapture[] = [],
) {
  const request = route.request()

  if (request.method() === 'POST') {
    const body = request.postDataJSON()
    captures.push({
      headers: request.headers(),
      body,
    })
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        campaignId: 'campaign-created-e2e',
        creditsUsed: 70,
        creditsRemaining: 99,
      }),
    })
    return
  }

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      campaigns: fakeCampaigns,
    }),
  })
}

export async function mockAdvertisingApi(page: Page, captures: AdvertisingPostCapture[] = []) {
  await page.route('**/api/advertising/campaigns', async (route) => {
    await fulfillCampaignsRoute(route, captures)
  })

  await page.route('**/api/advertising/upload', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        imageURL: '/og-image.png',
        imagePATH: 'ad-campaigns/announcer-e2e/e2e-og-image.png',
      }),
    })
  })
}
