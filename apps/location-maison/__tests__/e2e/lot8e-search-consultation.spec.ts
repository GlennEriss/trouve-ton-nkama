import { expect, test, type Page, type Request } from '@playwright/test'
import { expectNoHorizontalOverflow } from './helpers/layout'
import { mockCommonAppNoise } from './helpers/auth'
import { seedLot8ESearch, type Lot8ESearchSeed } from './helpers/search-dev'

const MOBILE_SIZE = { width: 390, height: 844 }
const DESKTOP_SIZE = { width: 1440, height: 960 }

async function mockAlgolia(page: Page, hit: Record<string, unknown>) {
  const requests: Request[] = []

  await page.route(/https:\/\/[^/]*algolia\.net\/.*/, async (route) => {
    requests.push(route.request())
    const requestBody = route.request().postDataJSON() as { requests?: unknown[] } | null
    const resultCount = Math.max(1, requestBody?.requests?.length ?? 1)
    const result = {
      hits: [hit],
      nbHits: 1,
      page: 0,
      nbPages: 1,
      hitsPerPage: 20,
      processingTimeMS: 1,
      query: '',
      params: '',
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results: Array.from({ length: resultCount }, () => result) }),
    })
  })

  return requests
}

test.describe('Lot 8E - recherche et consultation', () => {
  test.describe.configure({ mode: 'serial' })

  let seed: Lot8ESearchSeed

  test.beforeAll(async () => {
    seed = await seedLot8ESearch(`${Date.now()}-${Math.random().toString(16).slice(2, 8)}`)
  })

  test.afterAll(async () => {
    await seed?.cleanup()
  })

  test.beforeEach(async ({ page }) => {
    await mockCommonAppNoise(page)
    await page.route('**/api/advertising/active**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"creative":null}' })
    })
  })

  test('affiche un résultat et neutralise un filtre numérique injecté sur bureau', async ({ page }) => {
    await page.setViewportSize(DESKTOP_SIZE)
    const algoliaRequests = await mockAlgolia(page, seed.hit)

    await page.goto('/search?city=Libreville&minPrice=1%20OR%20state%3A%22DELETED%22', {
      waitUntil: 'domcontentloaded',
    })

    await expect(page.getByRole('button', { name: `Voir les détails de ${seed.hit.title}` })).toBeVisible({
      timeout: 20_000,
    })
    await expect.poll(() => algoliaRequests.length).toBeGreaterThan(0)

    const payloads = algoliaRequests.map((request) => request.postData() ?? '').join('\n')
    expect(payloads).toContain('moderationStatus')
    expect(payloads).toContain('APPROVED')
    expect(payloads).not.toContain('DELETED')
    await expectNoHorizontalOverflow(page)
  })

  test('soumet la recherche mobile sans recharger toute l application', async ({ page }) => {
    await page.setViewportSize(MOBILE_SIZE)
    await mockAlgolia(page, seed.hit)
    await page.goto('/search', { waitUntil: 'domcontentloaded' })
    await expect(page.getByPlaceholder('Logement, ville, quartier...')).toBeVisible({ timeout: 20_000 })

    await page.evaluate(() => {
      ;(window as Window & { __lot8eNavigationMarker?: string }).__lot8eNavigationMarker = 'preserved'
    })
    await page.getByPlaceholder('Logement, ville, quartier...').fill('studio Akébé')
    await page.getByRole('button', { name: 'Lancer la recherche' }).click()

    await expect(page).toHaveURL(/\/search\?query=studio(?:%20|\+)Ak%C3%A9b%C3%A9/)
    await expect.poll(() => page.evaluate(
      () => (window as Window & { __lot8eNavigationMarker?: string }).__lot8eNavigationMarker,
    )).toBe('preserved')
    await expectNoHorizontalOverflow(page)
  })

  test('rend la vraie annonce sur mobile et ne compte qu une vue locale', async ({ page }) => {
    await page.setViewportSize(MOBILE_SIZE)
    let viewRequests = 0
    await page.route(`**/api/property/${seed.propertyId}/statistics/view`, async (route) => {
      viewRequests += 1
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' })
    })

    await page.goto(`/houseDetails/${seed.propertyId}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: String(seed.hit.title) })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(String(seed.hit.description))).toBeVisible()
    await expect(page.getByTitle('Contacter via WhatsApp')).toBeVisible()
    await expect(page.getByTitle('Appeler')).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
    await expect.poll(() => viewRequests).toBe(1)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: String(seed.hit.title) })).toBeVisible({ timeout: 20_000 })
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
    await page.waitForTimeout(300)
    expect(viewRequests).toBe(1)
  })

  test('rend une page introuvable non indexable pour une annonce absente', async ({ page }) => {
    const response = await page.goto('/houseDetails/lot8e-missing-property', { waitUntil: 'domcontentloaded' })

    // Next.js peut conserver 200 après le début d'une réponse streamée, même lorsque
    // notFound() rend ensuite la vue 404. Le contenu et noindex sont les invariants utiles.
    expect([200, 404]).toContain(response?.status())
    await expect(page.getByText('Annonce introuvable', { exact: true })).toBeVisible()
    const robotDirectives = await page.locator('meta[name="robots"]').evaluateAll(
      (elements) => elements.map((element) => element.getAttribute('content') ?? ''),
    )
    expect(robotDirectives.some((directive) => /noindex/i.test(directive))).toBe(true)
  })
})
