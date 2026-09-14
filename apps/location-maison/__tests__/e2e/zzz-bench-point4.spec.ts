import crypto from 'node:crypto'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, E2E_BASE_URL, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { deleteProperties, deleteUserDoc, findPropertiesByOwner, seedAnnouncerUser } from './helpers/firebase-admin'

/**
 * THROWAWAY — mesure ponctuelle du point 4 (concurrence bornée des uploads d'images) sous
 * réseau throttlé, demandée explicitement par l'utilisateur. Fichier supprimé après usage,
 * jamais destiné à rester dans le dépôt.
 */
const BENCH_PHOTO_PATH =
  '/private/tmp/claude-501/-Users-glenneriss-Documents-projets/648f97c9-854e-44f3-9ace-ee5fa843652c/scratchpad/bench-photo.jpg'
const IMAGE_COUNT = 6
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-perf-bench4-${RUN_ID}`
const PROPERTY_TITLE = `Bench perf point4 ${RUN_ID}`

test.describe('BENCH point 4 — concurrence 3 vs illimitee (reseau throttle)', () => {
  test.describe.configure({ mode: 'serial' })
  let propertyId = ''

  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 5, { phoneNumbers: ['+24166545430'] })
  })

  test.afterAll(async () => {
    if (propertyId) await deleteProperties([propertyId])
    await deleteUserDoc(OWNER_UID)
  })

  test('mesure la phase image_upload (6 images) sous throttle reseau', async ({ page, context }) => {
    test.setTimeout(240_000)

    const client = await context.newCDPSession(page)
    await client.send('Network.enable')

    const phaseLogs: Array<{ phase?: string; durationMs?: number }> = []
    page.on('console', (msg) => {
      const text = msg.text()
      if (!text.includes('"phase"') || !text.includes('Submission phase')) return
      try {
        const parsed = JSON.parse(text)
        if (parsed?.context?.phase) phaseLogs.push(parsed.context)
      } catch {
        // ligne non-JSON, ignorée
      }
    })

    await signInAsAnnouncer(page.context(), E2E_BASE_URL, { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/property/add/studio', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Ajouter des images du bien').setInputFiles(
      Array.from({ length: IMAGE_COUNT }, () => BENCH_PHOTO_PATH),
    )
    await expect(page.getByText(`${IMAGE_COUNT}/10 images`)).toBeVisible({ timeout: 90000 })
    await page.getByLabel("Titre de l'annonce").fill(PROPERTY_TITLE)
    await page.getByLabel("Description de l'annonce").fill(
      `Description suffisamment longue pour le bench perf point 4 ${RUN_ID}.`,
    )
    await page.getByLabel('Superficie du bien en mètres carrés').fill('28')
    await page.getByLabel('Prix du bien en FCFA').fill('120000')
    await page.getByText('Propriétaire direct', { exact: true }).click()
    await page.getByRole('button', { name: /^Sélectionner le tag/ }).first().click()
    await page.getByRole('button', { name: /^Suivant$/i }).click()

    await expect(page.getByText('Numéro du studio', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: /^Suivant$/i }).click()

    await expect(page.getByText('Localisation du bien').first()).toBeVisible({ timeout: 15000 })
    await page.locator('#property-province').click()
    await page.getByRole('option', { name: 'Estuaire' }).click()
    await page.locator('#property-city').fill('Libreville')
    await page.locator('#property-city-suggestions').getByRole('option').first().click({ timeout: 15000 })
    await page.locator('#property-district').fill('Glass')
    await page.locator('#property-district-suggestions').getByRole('option').first().click({ timeout: 15000 })

    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (750 * 1024) / 8,
      uploadThroughput: (128 * 1024) / 8,
      latency: 150,
    })

    await page.getByRole('button', { name: /^Enregistrer$/i }).click()
    await expect(page.getByText('Propriété ajoutée avec succès!').first()).toBeVisible({ timeout: 220000 })

    const created = (await findPropertiesByOwner(OWNER_UID))[0]
    propertyId = created?.id ?? ''

    const uploadPhase = phaseLogs.find((record) => record.phase === 'image_upload')
    // eslint-disable-next-line no-console
    console.log(`BENCH_RESULT image_upload durationMs=${uploadPhase?.durationMs ?? 'NOT_FOUND'}`)
    // eslint-disable-next-line no-console
    console.log('BENCH_ALL_PHASES=' + JSON.stringify(phaseLogs))
  })
})
