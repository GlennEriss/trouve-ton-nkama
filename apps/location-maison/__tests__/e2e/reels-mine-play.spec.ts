import crypto from 'node:crypto'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { deleteReels, seedAnnouncerUser, seedReel } from './helpers/firebase-admin'

/**
 * Cliquer la miniature d'un réel sur /reels/mine doit lancer le réel — ajouté le 2026-08-30
 * suite à une demande directe. Vraie session Firebase requise (voir BUGS-REELS-E2E-2026-08.md) :
 * /reels/[reelId] (SingleReelClient.tsx) charge le réel via un fetch classique, mais la page
 * /reels/mine elle-même n'affiche les réels qu'une fois isFirebaseConnected.
 *
 * RUN_ID unique par worker (crypto.randomUUID()) : même raison que les autres specs de ce
 * dossier — fullyParallel peut répartir les tests sur des workers séparés.
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-reels-mine-play-${RUN_ID}`

const READY_REEL_ID = `e2e-reels-mine-play-ready-${RUN_ID}`
const READY_DESCRIPTION = 'Villa avec piscine, prête à être visionnée.'

const PROCESSING_REEL_ID = `e2e-reels-mine-play-processing-${RUN_ID}`
const PROCESSING_DESCRIPTION = 'Réel encore en cours de traitement.'

test.describe('Lire un réel depuis sa miniature sur /reels/mine — vrai Firestore', () => {
  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 0)
    await seedReel(OWNER_UID, { id: READY_REEL_ID, description: READY_DESCRIPTION })
    await seedReel(OWNER_UID, {
      id: PROCESSING_REEL_ID,
      description: PROCESSING_DESCRIPTION,
      processingStatus: 'processing',
      moderationStatus: 'PENDING',
    })
  })

  test.afterAll(async () => {
    await deleteReels([
      { id: READY_REEL_ID, uid: OWNER_UID },
      { id: PROCESSING_REEL_ID, uid: OWNER_UID },
    ])
  })

  test('clique la miniature d\'un réel prêt et arrive sur sa page de lecture', async ({ page }) => {
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/mine', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(READY_DESCRIPTION)).toBeVisible({ timeout: 20000 })

    const card = page
      .getByText(READY_DESCRIPTION)
      .locator('xpath=ancestor::div[contains(@class,"flex h-full flex-col")][1]')
    await card.getByRole('link', { name: 'Lire le réel' }).click()

    await expect(page).toHaveURL(new RegExp(`/reels/${READY_REEL_ID}$`))
    await expect(page.getByRole('heading', { name: 'Application error', exact: false })).not.toBeVisible()
    await expect(page.getByText('n\'est plus disponible')).not.toBeVisible()
    // Preuve qu'on est bien sur LE bon réel, pas juste une page qui ne plante pas.
    await expect(page.getByText(READY_DESCRIPTION)).toBeVisible({ timeout: 15000 })
  })

  test('la miniature d\'un réel encore en traitement n\'est pas cliquable', async ({ page }) => {
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/mine', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(PROCESSING_DESCRIPTION)).toBeVisible({ timeout: 20000 })

    const card = page
      .getByText(PROCESSING_DESCRIPTION)
      .locator('xpath=ancestor::div[contains(@class,"flex h-full flex-col")][1]')
    // /reels/[reelId] n'affiche que les réels approuvés + prêts (getPublicReelById) — un lien
    // "Lire le réel" ici afficherait à tort "n'est plus disponible" ; il ne doit donc pas exister.
    await expect(card.getByRole('link', { name: 'Lire le réel' })).toHaveCount(0)
  })
})
