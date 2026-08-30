import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { expect, test, type Page } from '@playwright/test'
import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { expectNoHorizontalOverflow } from './helpers/layout'
import { seedLot8DReels, type Lot8DSeed } from './helpers/reels-dev'

const execFileAsync = promisify(execFile)
const MOBILE_SIZE = { width: 390, height: 844 }
const DESKTOP_SIZE = { width: 1440, height: 960 }

const publicReel = {
  id: 'lot8d-public-reel',
  propertyId: null,
  createdBy: 'lot8d-public-owner',
  videoUrl: 'https://example.test/lot8d.mp4',
  thumbnailUrl: '',
  contact: '+24166545430',
  description: 'Appartement lumineux proche des commerces.',
  moderationStatus: 'APPROVED',
  processingStatus: 'ready',
  viewCount: 32,
  likeCount: 4,
  shareCount: 2,
  giftCount: 0,
  giftTotalAmount: 0,
}

async function mockFeedDependencies(page: Page) {
  await page.route('**/api/reels/*/statistics/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' })
  })
  await page.route('**/api/advertising/active**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"creative":null}' })
  })
  await page.route('https://example.test/**', async (route) => route.abort())
}

test.describe('Lot 8D - résilience et responsive du fil Réels', () => {
  for (const scenario of [
    { name: 'mobile', viewport: MOBILE_SIZE },
    { name: 'desktop', viewport: DESKTOP_SIZE },
  ]) {
    test(`récupère une erreur réseau et reste utilisable sur ${scenario.name}`, async ({ page }) => {
      await page.setViewportSize(scenario.viewport)
      await mockCommonAppNoise(page)
      await mockFeedDependencies(page)
      let networkRestored = false

      await page.route('**/api/reels/feed**', async (route) => {
        if (!networkRestored) {
          await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"offline"}' })
          return
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ reels: [publicReel], nextCursor: null }),
        })
      })

      await page.goto('/reels', { waitUntil: 'domcontentloaded' })
      await expect(page.getByText('Impossible de charger les réels')).toBeVisible({ timeout: 20_000 })

      networkRestored = true
      const retry = page.getByRole('button', { name: 'Réessayer' })
      const retryBox = await retry.boundingBox()
      expect(retryBox?.height).toBeGreaterThanOrEqual(44)
      await retry.click()

      await expect(page.locator('button[aria-label="J\'aime ce réel"]:visible')).toBeVisible()
      await expectNoHorizontalOverflow(page)
    })
  }
})

test.describe('Lot 8D - parcours annonceur Réels sur Firebase Dev', () => {
  test.describe.configure({ mode: 'serial' })

  let seed: Lot8DSeed
  let fixtureDirectory = ''
  let videoFixture = ''
  let announcer: typeof E2E_ANNOUNCER

  test.beforeAll(async () => {
    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
    seed = await seedLot8DReels(runId)
    announcer = {
      ...E2E_ANNOUNCER,
      uid: seed.uid,
      email: `${seed.uid}@example.test`,
      lastname: 'Lot 8D',
    }

    fixtureDirectory = await mkdtemp(path.join(tmpdir(), 'lot8d-reels-'))
    videoFixture = path.join(fixtureDirectory, 'visite-verticale.mp4')
    const installerEntry = require.resolve('@ffmpeg-installer/ffmpeg', {
      paths: [path.resolve(process.cwd(), 'functions')],
    })
    const ffmpegPath = (require(installerEntry) as { path: string }).path
    await execFileAsync(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'testsrc2=s=360x640:r=24:d=2',
      '-f', 'lavfi', '-i', 'sine=frequency=660:duration=2',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-shortest', '-movflags', '+faststart',
      videoFixture,
    ])
  })

  test.afterAll(async () => {
    await seed?.cleanup()
    if (fixtureDirectory) await rm(fixtureDirectory, { recursive: true, force: true })
  })

  test.beforeEach(async ({ page }) => {
    await signInAsAnnouncer(page.context(), undefined, announcer)
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
  })

  test('charge Mes réels, les statuts et les statistiques avec une vraie session Firebase', async ({ page }) => {
    await page.setViewportSize(MOBILE_SIZE)
    const forbiddenToken = await page.request.post('/api/generate-token', { data: { uid: 'another-user' } })
    expect(forbiddenToken.status()).toBe(403)

    await page.goto('/reels/mine', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Mes réels' })).toBeVisible()
    await expect(page.getByText('Studio lumineux à modifier pendant le test.')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Réel destiné au test de suppression.')).toBeVisible()
    await expect(page.getByText('Traitement en cours')).toBeVisible()
    // Les stats sont dans un carousel sur mobile ET une grille desktop, toutes deux dans le DOM
    // en permanence (seul le CSS masque l'une ou l'autre) — Playwright compte les éléments
    // masqués dans la résolution stricte d'un locator, d'où le scope explicite au bloc mobile
    // (viewport de ce test) via son data-testid, plutôt que .first()/xpath qui ne garantissaient
    // pas de cibler le bon bloc.
    const mobileStats = page.getByTestId('reel-stats-mobile')
    await expect(mobileStats.getByText('Vues totales').locator('..').getByText('128')).toBeVisible()
    await expect(mobileStats.getByText('Likes reçus').locator('..').getByText('14')).toBeVisible()
    await expect(mobileStats.getByText('Partages', { exact: true }).locator('..').getByText('6')).toBeVisible()

    const newReel = page.getByRole('link', { name: 'Nouveau réel' })
    await expect(newReel).toHaveAttribute('href', '/reels/add?returnTo=%2Freels%2Fmine')
    await expectNoHorizontalOverflow(page)
  })

  test('ouvre l’éditeur vidéo vertical sans contrôle masqué sur mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_SIZE)
    await page.goto('/reels/add?returnTo=%2Freels%2Fmine', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Choisir une vidéo').setInputFiles(videoFixture)

    const publishButton = page.getByRole('button', { name: 'Publier le réel' })
    await expect(publishButton).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('navigation', { name: /Navigation mobile/i })).toHaveCount(0)

    const contactToggle = page.getByRole('button', { name: /Contact :/i })
    for (const control of [page.getByRole('button', { name: 'Annuler' }), contactToggle, publishButton]) {
      const box = await control.boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(44)
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }

    await contactToggle.click()
    await expect(page.getByPlaceholder('Ex: +241 XX XX XX XX')).toHaveAttribute('type', 'tel')
    await page.getByPlaceholder('Ajouter une légende...').fill('Visite rapide du logement, proche des commerces.')
    await expectNoHorizontalOverflow(page)
  })

  test('modifie réellement le contact et la description', async ({ page }) => {
    await page.setViewportSize(DESKTOP_SIZE)
    const nextDescription = 'Studio rénové, calme et proche des transports.'
    const nextContact = '+24177112233'

    await page.goto(`/reels/${seed.reelIds.edit}/edit`, { waitUntil: 'domcontentloaded' })
    const contactToggle = page.getByRole('button', { name: /Contact :/i })
    await expect(contactToggle).toBeVisible({ timeout: 20_000 })
    await contactToggle.click()
    await page.getByPlaceholder('Ex: +241 XX XX XX XX').fill(nextContact)
    await page.getByPlaceholder('Ajouter une légende...').fill(nextDescription)
    await page.getByRole('button', { name: 'Enregistrer les modifications' }).click()

    await expect(page).toHaveURL(/\/reels\/mine$/, { timeout: 20_000 })
    await expect.poll(async () => (await seed.db.collection('reels').doc(seed.reelIds.edit).get()).data()?.description)
      .toBe(nextDescription)
    await expect.poll(async () => (await seed.db.collection('reels').doc(seed.reelIds.edit).get()).data()?.contact)
      .toBe(nextContact)
  })

  test('confirme puis supprime réellement un réel sans double action', async ({ page }) => {
    await page.setViewportSize(MOBILE_SIZE)
    await page.goto('/reels/mine', { waitUntil: 'domcontentloaded' })

    const description = page.getByText('Réel destiné au test de suppression.')
    await expect(description).toBeVisible({ timeout: 20_000 })
    const card = description.locator('xpath=ancestor::div[contains(@class,"flex h-full flex-col")][1]')
    await card.getByRole('button', { name: 'Supprimer' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Supprimer ce réel ?' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Supprimer', exact: true }).click()

    await expect(description).toHaveCount(0, { timeout: 20_000 })
    await expect.poll(async () => (await seed.db.collection('reels').doc(seed.reelIds.remove).get()).exists)
      .toBe(false)
  })
})
