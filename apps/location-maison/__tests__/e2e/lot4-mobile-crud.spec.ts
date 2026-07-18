import { expect, test, type Page } from '@playwright/test'
import { createFakeAdsResponse, fakeAd, mockAnnouncerAds } from './helpers/announcer-ads'
import { mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { expectNoHorizontalOverflow } from './helpers/layout'

const MOBILE_SIZE = { width: 390, height: 844 }

async function gotoApp(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30_000 })
}

test.describe('Lot 4C mobile CRUD annonceur sans ecriture destructive', () => {
  test.use({ viewport: MOBILE_SIZE })

  test.beforeEach(async ({ page }) => {
    await signInAsAnnouncer(page.context())
    await mockCommonAppNoise(page)
  })

  test('le formulaire studio expose la reinitialisation avec confirmation', async ({ page }) => {
    await page.route('**/api/tags', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, tags: ['Calme', 'Parking', 'Sécurisé'] }),
      })
    })

    await gotoApp(page, '/property/add/studio')

    await expect(page.getByRole('heading', { name: /Ajout d'un studio/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Suivant$/i })).toBeVisible()

    const resetButton = page.getByRole('button', { name: /^Réinitialiser$/i }).first()
    await resetButton.scrollIntoViewIfNeeded()
    await expect(resetButton).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await resetButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: /Réinitialiser le formulaire/i })).toBeVisible()
    await expect(dialog.getByText(/Tous les champs saisis/i)).toBeVisible()

    await dialog.getByRole('button', { name: /^Annuler$/i }).click()
    await expect(dialog).toHaveCount(0)
  })

  test('la gestion des annonces filtre, nettoie les prix et reinitialise les champs', async ({ page }) => {
    const requestUrls: string[] = []
    await page.route('**/api/announcer/ads**', async (route) => {
      requestUrls.push(route.request().url())
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createFakeAdsResponse([fakeAd])),
      })
    })

    await gotoApp(page, '/property')

    const searchInput = page.getByPlaceholder(/Titre, description, ville, quartier/i)
    await expect(searchInput).toBeVisible()
    await searchInput.fill('Akanda')

    await expect
      .poll(() => requestUrls.some((url) => new URL(url).searchParams.get('q') === 'Akanda'))
      .toBe(true)

    const priceMinInput = page.locator('label', { hasText: /Prix min/i }).locator('xpath=..').locator('input')
    await priceMinInput.fill('120abc000')
    await expect(priceMinInput).toHaveValue('120000')

    const resetButton = page.getByRole('button', { name: /^Réinitialiser$/i }).first()
    await expect(resetButton).toBeEnabled()
    await resetButton.click()

    await expect(searchInput).toHaveValue('')
    await expect(priceMinInput).toHaveValue('')
    await expectNoHorizontalOverflow(page)
  })

  test('archiver et supprimer une annonce passent par un modal de confirmation annulable', async ({ page }) => {
    await mockAnnouncerAds(page)
    await gotoApp(page, '/property')

    await expect(page.getByRole('heading', { name: /Appartement moderne a Akanda/i })).toBeVisible()

    await page.getByRole('button', { name: /^Archiver$/i }).click()
    let dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: /Archiver cette annonce/i })).toBeVisible()
    await expect(dialog.getByText(/ne sera plus visible/i)).toBeVisible()
    await dialog.getByRole('button', { name: /^Annuler$/i }).click()
    await expect(dialog).toHaveCount(0)

    await page.getByRole('button', { name: /^Supprimer$/i }).click()
    dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: /Supprimer cette annonce/i })).toBeVisible()
    await expect(dialog.getByText(/Cette action est définitive/i)).toBeVisible()
    await dialog.getByRole('button', { name: /^Annuler$/i }).click()
    await expect(dialog).toHaveCount(0)

    await expect(page.getByRole('heading', { name: /Appartement moderne a Akanda/i })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})
