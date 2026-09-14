import crypto from 'node:crypto'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, E2E_BASE_URL, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { deleteReels, findReelByOwner, getReel, seedAnnouncerUser } from './helpers/firebase-admin'

/**
 * THROWAWAY — mesure ponctuelle du point 6 (upload Reel reprenable + progression + timeout
 * relevé de 2 à 10 min) sous réseau throttlé, demandée explicitement par l'utilisateur.
 * Fichier supprimé après usage, jamais destiné à rester dans le dépôt.
 */
const BENCH_VIDEO_PATH =
  '/private/tmp/claude-501/-Users-glenneriss-Documents-projets/648f97c9-854e-44f3-9ace-ee5fa843652c/scratchpad/bench-reel-video.mp4'
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-perf-bench6-${RUN_ID}`
const REEL_DESCRIPTION = `Bench perf point 6 ${RUN_ID}.`

test.describe('BENCH point 6 — upload reel reprenable / timeout 2min vs 10min (reseau throttle)', () => {
  test.describe.configure({ mode: 'serial' })
  let createdReelId = ''

  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 0)
  })

  test.afterAll(async () => {
    if (createdReelId) await deleteReels([{ id: createdReelId, uid: OWNER_UID }])
  })

  test('upload video reel sous throttle reseau', async ({ page, context }) => {
    test.setTimeout(660_000)

    const client = await context.newCDPSession(page)
    await client.send('Network.enable')

    const progressSamples: number[] = []

    await signInAsAnnouncer(page.context(), E2E_BASE_URL, { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/add', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Choisir une vidéo').setInputFiles(BENCH_VIDEO_PATH)

    const publishButton = page.getByRole('button', { name: 'Publier le réel' })
    await expect(publishButton).toBeVisible({ timeout: 15000 })
    await page.getByPlaceholder('Ajouter une légende...').fill(REEL_DESCRIPTION)

    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (750 * 1024) / 8,
      uploadThroughput: (128 * 1024) / 8,
      latency: 150,
    })

    const clickedAt = Date.now()
    await publishButton.click()

    // Échantillonne la progression réelle (role="progressbar") pendant l'upload throttlé —
    // preuve que l'utilisateur voit une progression qui avance, pas un écran figé.
    const sampleTimer = setInterval(async () => {
      try {
        const value = await page.getByRole('progressbar').getAttribute('aria-valuenow')
        if (value !== null) progressSamples.push(Number(value))
      } catch {
        // page pas encore prête / élément disparu, ignoré
      }
    }, 3000)

    let outcome: 'success' | 'timeout_error' | 'other_error' = 'other_error'
    try {
      const deadline = Date.now() + 640000
      const successLocator = page.getByText('Vidéo envoyée', { exact: true }).first()
      const errorLocator = page.getByText(/pris trop de temps|Envoi annulé|délai dépassé/i).first()
      while (Date.now() < deadline) {
        if (await successLocator.isVisible().catch(() => false)) {
          outcome = 'success'
          break
        }
        if (await errorLocator.isVisible().catch(() => false)) {
          outcome = 'timeout_error'
          break
        }
        await page.waitForTimeout(2000)
      }
    } finally {
      clearInterval(sampleTimer)
    }

    const wallClockMs = Date.now() - clickedAt
    // eslint-disable-next-line no-console
    console.log(`BENCH_RESULT outcome=${outcome} wallClockMs=${wallClockMs}`)
    // eslint-disable-next-line no-console
    console.log('BENCH_PROGRESS_SAMPLES=' + JSON.stringify(progressSamples))

    if (outcome === 'success') {
      await expect.poll(async () => (await findReelByOwner(OWNER_UID))?.id, { timeout: 15000 }).not.toBeUndefined()
      const found = await findReelByOwner(OWNER_UID)
      createdReelId = found!.id
      const reel = await getReel(createdReelId)
      // eslint-disable-next-line no-console
      console.log(`BENCH_REEL_STATUS=${reel?.processingStatus}`)
    }
  })
})
