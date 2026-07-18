import { expect, test, type Locator, type Page } from '@playwright/test'

const MOBILE_SIZE = { width: 390, height: 844 }

const fakeReels = [
  {
    id: 'reel-e2e-1',
    propertyId: null,
    createdBy: 'announcer-e2e',
    videoUrl: 'https://example.com/reel-e2e-1.mp4',
    thumbnailUrl: '',
    contact: '+24166545430',
    description: 'Studio lumineux proche des commerces.',
    moderationStatus: 'APPROVED',
    processingStatus: 'processed',
    viewCount: 12,
    likeCount: 2,
    shareCount: 1,
    giftCount: 0,
    giftTotalAmount: 0,
  },
]

async function mockReelsFeed(page: Page, reels = fakeReels) {
  await page.route('**/api/reels/feed**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reels, nextCursor: null }),
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
      body: JSON.stringify({ creative: null }),
    })
  })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    })
  })
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }))

  expect(metrics.scrollWidth, `document overflow: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(metrics.clientWidth + 1)
  expect(metrics.bodyScrollWidth, `body overflow: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(metrics.clientWidth + 1)
}

async function expectAboveBottomNav(page: Page, locator: Locator) {
  const nav = page.getByRole('navigation', { name: /Navigation mobile/i })
  await expect(nav).toBeVisible()
  await expect(locator).toBeVisible()

  const [navBox, targetBox] = await Promise.all([nav.boundingBox(), locator.boundingBox()])
  expect(navBox).not.toBeNull()
  expect(targetBox).not.toBeNull()
  expect(targetBox!.y + targetBox!.height).toBeLessThanOrEqual(navBox!.y + 2)
}

test.describe('Lot 4 mobile public UX', () => {
  test.use({ viewport: MOBILE_SIZE })

  test('la bottom navigation invite donne acces aux pages publiques majeures', async ({ page }) => {
    await mockReelsFeed(page)

    await page.goto('/')

    const bottomNav = page.getByRole('navigation', { name: /Navigation mobile/i })
    await expect(bottomNav).toBeVisible()
    await expect(bottomNav.getByRole('link', { name: /Accueil/i })).toBeVisible()
    await expect(bottomNav.getByRole('link', { name: /Recherche/i })).toBeVisible()
    await expect(bottomNav.getByRole('link', { name: /Réels/i })).toBeVisible()
    await expect(bottomNav.getByRole('link', { name: /Connexion/i })).toBeVisible()
    await expect(bottomNav.getByRole('link', { name: /Publier/i })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    const reelsLink = bottomNav.getByRole('link', { name: /^Réels$/i })
    await expect(reelsLink).toHaveAttribute('href', '/reels')
    await reelsLink.click()
    await expect(page).toHaveURL(/\/reels$/, { timeout: 20_000 })
    await expect(page.getByRole('button', { name: /J'aime ce réel/i })).toBeVisible({ timeout: 15_000 })

    await bottomNav.getByRole('link', { name: /^Connexion$/i }).click()
    await expect(page).toHaveURL(/\/signin/, { timeout: 20_000 })
  })

  test('les routes vraiment protegees renvoient le visiteur vers connexion avec callback', async ({ request }) => {
    const protectedRoutes = [
      { path: '/reels/mine', callback: '%2Freels%2Fmine' },
      { path: '/property', callback: '%2Fproperty' },
    ]

    for (const route of protectedRoutes) {
      const response = await request.get(route.path, { maxRedirects: 0 })
      expect(response.status()).toBe(307)
      expect(response.headers().location).toContain(`/signin?callbackUrl=${route.callback}`)
    }
  })

  test('la bottom navigation ne couvre pas le footer sur mobile invite', async ({ page }) => {
    await page.goto('/terms-of-use')

    const footerCopyright = page
      .locator('footer')
      .getByText(/Trouve Ton Nkama.*Tous droits réservés/i)
    await footerCopyright.scrollIntoViewIfNeeded()

    await expectAboveBottomNav(page, footerCopyright)
    await expectNoHorizontalOverflow(page)
  })

  test('la creation de reel reste publique, sans bottom nav, et le retour respecte returnTo', async ({ page }) => {
    await page.goto('/reels/add?returnTo=%2Freels')

    await expect(page).toHaveURL(/\/reels\/add\?returnTo=%2Freels/)
    await expect(page.getByRole('heading', { name: /Créer un réel/i })).toBeVisible()
    await expect(page.getByText(/Glissez une vidéo ou cliquez/i)).toBeVisible()
    await expect(page.getByRole('navigation', { name: /Navigation mobile/i })).toHaveCount(0)
    await expectNoHorizontalOverflow(page)

    await page.getByRole('link', { name: /Retour/i }).click()
    await expect(page).toHaveURL(/\/reels$/)
  })

  test('le rail mobile des reels garde l ordre attendu et le partage expose les reseaux', async ({ page }) => {
    await mockReelsFeed(page)
    await page.goto('/reels')

    const buttons = [
      page.getByRole('button', { name: /J'aime ce réel/i }),
      page.getByRole('button', { name: /Contacter via WhatsApp/i }),
      page.getByRole('button', { name: /^Appeler$/i }),
      page.getByRole('button', { name: /Offrir un cadeau/i }),
      page.getByRole('button', { name: /Partager ce réel/i }),
      page.getByRole('button', { name: /Activer le son|Couper le son/i }),
    ]

    for (const button of buttons) {
      await expect(button).toBeVisible()
      const box = await button.boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(44)
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }

    const positions = await Promise.all(buttons.map(async (button) => (await button.boundingBox())!.y))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))

    await page.getByRole('button', { name: /Partager ce réel/i }).click()
    await expect(page.getByRole('menuitem', { name: /WhatsApp/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /Facebook/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /^X$/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /Mail/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /TikTok/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /Copier le lien/i })).toBeVisible()
  })

  test('la fin du feed reels propose clairement de creer un reel', async ({ page }) => {
    await mockReelsFeed(page)
    await page.goto('/reels')

    await expect(page.getByRole('button', { name: /J'aime ce réel/i })).toBeVisible()

    await page.mouse.move(195, 720)
    await page.mouse.down()
    await page.mouse.move(195, 120, { steps: 12 })
    await page.mouse.up()

    await expect(page.getByRole('heading', { name: /Mettez votre bien en avant/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Créer un réel/i })).toBeVisible()
  })
})
