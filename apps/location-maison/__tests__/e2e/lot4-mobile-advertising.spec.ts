import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'
import { mockAdvertisingApi, type AdvertisingPostCapture } from './helpers/advertising'
import { mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { expectNoHorizontalOverflow } from './helpers/layout'

const MOBILE_SIZE = { width: 390, height: 844 }
const AD_IMAGE_PATH = path.join(process.cwd(), 'public', 'og-image.png')

async function gotoApp(page: Page, pathName: string) {
  await page.goto(pathName, { waitUntil: 'domcontentloaded', timeout: 30_000 })
}

async function goToMessageStep(page: Page) {
  await gotoApp(page, '/advertising/create')

  await expect(page.getByRole('heading', { name: /Créer une publicité/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Marque.*70 crédits.*17\s?500/i })).toBeVisible()

  await page.getByRole('button', { name: /Continuer vers l’étape 2/i }).click()
  await expect(page.getByRole('heading', { name: /Ajouter les visuels/i })).toBeVisible()

  await page.locator('#default-ad-image').setInputFiles(AD_IMAGE_PATH)
  await expect(page.getByText(/5\/5 emplacements prêts/i)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/Format vertical recommandé pour Réels/i)).toBeVisible()

  await page.getByRole('button', { name: /Continuer vers l’étape 3/i }).click()
  await expect(page.getByRole('heading', { name: /Préparer le message/i })).toBeVisible()
}

async function fillMessageAndPreview(page: Page) {
  await page.getByLabel(/Accroche/i).fill('Promo spéciale Akanda')
  await page.getByLabel(/Description courte/i).fill('Un visuel clair pour générer des contacts qualifiés.')
  await page.getByLabel(/Lien au clic/i).fill('wa.me/24166545430')
  await page.getByLabel(/Lien au clic/i).blur()
  await expect(page.getByLabel(/Lien au clic/i)).toHaveValue('https://wa.me/24166545430')

  await page.getByRole('button', { name: /Continuer vers l’étape 4/i }).click()
  await expect(page.getByRole('heading', { name: /Vérifier avant publication/i })).toBeVisible()
}

test.describe('Lot 4D mobile publicites', () => {
  test.use({ viewport: MOBILE_SIZE })

  test.beforeEach(async ({ page }) => {
    await signInAsAnnouncer(page.context())
    await mockCommonAppNoise(page)
  })

  test('le dashboard publicites affiche credits, stats, campagnes et CTA de creation', async ({ page }) => {
    await mockAdvertisingApi(page)
    await gotoApp(page, '/advertising')

    await expect(page.getByRole('heading', { name: /^Publicités$/i })).toBeVisible()
    await expect(page.getByText(/169 crédits/i)).toBeVisible()
    // .first() : les tuiles de stats existent en double dans le DOM (carrousel mobile +
    // grid desktop, seul le CSS bascule entre elles selon le viewport) — voir
    // AdvertisingDashboardClient.tsx.
    await expect(page.getByText(/Campagnes actives/i).first()).toBeVisible()
    await expect(page.getByText(/Vues/i).first()).toBeVisible()
    await expect(page.getByText(/Clics/i).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /Promo Akanda/i })).toBeVisible()
    await expect(page.getByText(/1.?234 vues/i)).toBeVisible()
    await expect(page.getByText(/56 clics/i)).toBeVisible()
    await expect(page.getByText(/70 crédits/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /Créer une publicité/i })).toHaveAttribute('href', '/advertising/create')
    await expectNoHorizontalOverflow(page)
  })

  test('le wizard bloque sans lien, montre la valeur FCFA et les apercus dont reels', async ({ page }) => {
    await mockAdvertisingApi(page)
    await goToMessageStep(page)

    await expect(page.getByText(/Ajoutez un lien au clic pour que la publicité puisse convertir/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Continuer vers l’étape 4/i })).toBeDisabled()

    await fillMessageAndPreview(page)

    await expect(page.getByText(/70 crédits/i).first()).toBeVisible()
    await expect(page.getByText(/≈ 17\s?500 FCFA/i).first()).toBeVisible()
    await expect(page.getByText(/Format vertical recommandé pour Réels/i)).toBeVisible()
    await expect(page.getByText(/Aperçu visuel dans les réels/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Recherche$/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Immobilier$/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Réels$/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Payer.*publier/i })).toBeEnabled()
    await expectNoHorizontalOverflow(page)
  })

  test('publier envoie une seule requete avec idempotence sans debiter de vrais credits', async ({ page }) => {
    const captures: AdvertisingPostCapture[] = []
    await mockAdvertisingApi(page, captures)
    await goToMessageStep(page)
    await fillMessageAndPreview(page)

    const publishButton = page.getByRole('button', { name: /Payer.*publier/i })
    await publishButton.click()
    await publishButton.click({ timeout: 1000 }).catch(() => undefined)

    await expect(page).toHaveURL(/\/advertising$/, { timeout: 20_000 })
    expect(captures).toHaveLength(1)
    expect(captures[0].headers['idempotency-key']).toBeTruthy()
    expect(captures[0].body.idempotencyKey).toBe(captures[0].headers['idempotency-key'])
    expect(captures[0].body.packageId).toBe('brand')
    expect(captures[0].body.creative.ctaUrl).toBe('https://wa.me/24166545430')
    expect(captures[0].body.creative.assets).toBeUndefined()
    expect(captures[0].body.creative.imageURL).toBe('/og-image.png')
  })
})
