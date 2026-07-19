import { expect, test, type Page } from '@playwright/test'

import { mockCommonAppNoise } from './helpers/auth'

const fakeReels = Array.from({ length: 8 }, (_, index) => ({
  id: `reel-lot6b-${index + 1}`,
  propertyId: null,
  createdBy: 'announcer-e2e',
  videoUrl: `https://example.com/reel-lot6b-${index + 1}.mp4`,
  thumbnailUrl: '',
  contact: '+24166545430',
  description: `Réel de test ${index + 1}`,
  moderationStatus: 'APPROVED',
  processingStatus: 'ready',
  viewCount: 10 + index,
  likeCount: index,
  shareCount: 0,
  giftCount: 0,
  giftTotalAmount: 0,
}))

const houseCreative = {
  campaignId: 'campaign-e2e-lot6b',
  placement: 'reels_infeed',
  imageURL: 'https://example.com/campaign-e2e-lot6b.jpg',
  headline: 'Campagne plateforme 6B',
  body: 'Une publicité interne affichée comme un réel.',
  ctaLabel: 'Découvrir',
  ctaUrl: 'https://example.com/offre-lot6b',
}

async function installMocks(page: Page, trackedEvents: Array<Record<string, unknown>>) {
  await mockCommonAppNoise(page)

  await page.addInitScript(() => {
    Object.defineProperty(window, 'adsbygoogle', {
      configurable: true,
      writable: true,
      value: [],
    })
  })

  await page.route('https://pagead2.googlesyndication.com/**', (route) => route.abort())
  await page.route('https://example.com/**', (route) => route.abort())

  await page.route('**/api/reels/feed**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reels: fakeReels, nextCursor: null }),
    })
  })
  await page.route('**/api/reels/*/statistics/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })
  await page.route('**/api/advertising/active**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ creative: houseCreative }),
    })
  })
  await page.route('**/api/advertising/track', async (route) => {
    const payload = route.request().postData()
    if (payload) trackedEvents.push(JSON.parse(payload))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })
}

async function goToNextSlide(page: Page, times: number) {
  const next = page.getByRole('button', { name: /Réel suivant/i })
  for (let index = 0; index < times; index += 1) {
    await next.click()
    await page.waitForTimeout(350)
  }
}

test('Lot 6B diffuse AdSense et une campagne maison dans le feed reels', async ({ page }) => {
  const trackedEvents: Array<Record<string, unknown>> = []
  await installMocks(page, trackedEvents)

  await page.goto('/reels', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await expect(page.getByRole('button', { name: /J'aime ce réel/i })).toBeVisible({
    timeout: 15_000,
  })

  await goToNextSlide(page, 4)

  const adsenseUnit = page.locator('ins.adsbygoogle[data-slot-key="ad-0"]')
  await expect(adsenseUnit).toHaveCount(1)
  await adsenseUnit.evaluate((element) => element.setAttribute('data-ad-status', 'unfilled'))

  const fallbackHeading = page.getByRole('heading', {
    name: /Votre bien peut être vu ici/i,
  })
  await expect(fallbackHeading).toBeInViewport()
  await expect(page.getByRole('link', { name: /Faire de la pub/i })).toBeInViewport()

  const fallbackSlide = fallbackHeading.locator(
    'xpath=ancestor::div[contains(@class,"relative") and contains(@class,"h-full")][1]',
  )
  const fallbackBox = await fallbackSlide.boundingBox()
  expect(fallbackBox).not.toBeNull()
  expect(fallbackBox!.height).toBeGreaterThan(600)
  expect(fallbackBox!.height / fallbackBox!.width).toBeGreaterThan(1.5)

  await goToNextSlide(page, 5)

  const houseHeading = page.getByText(houseCreative.headline, { exact: true })
  await expect(houseHeading).toBeInViewport()
  await expect(page.getByText(houseCreative.body, { exact: true })).toBeInViewport()
  await expect(page.getByText(houseCreative.ctaLabel, { exact: true })).toBeInViewport()

  await expect.poll(
    () => trackedEvents.filter((event) => (
      event.campaignId === houseCreative.campaignId && event.event === 'impression'
    )).length,
  ).toBe(1)
})
