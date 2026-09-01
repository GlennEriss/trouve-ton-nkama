import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { deleteReels, findReelByOwner, seedAnnouncerUser } from './helpers/firebase-admin'

const execFileAsync = promisify(execFile)

/**
 * Demande directe de l'utilisateur : sur /reels/add sans annonce présélectionnée (entrée directe
 * depuis "Mes réels"/le fil, voir CreateOrphanReelClient.tsx), un chip "Immobilier"/"Mode" à côté
 * du contact permet de classer le réel sans avoir à lui trouver une annonce à rattacher. Preuve
 * de bout en bout : vraie publication UI -> vraie écriture Firestore (Admin SDK), pas seulement
 * l'apparence du chip sélectionné côté client (déjà couvert par un test Jest de composant).
 *
 * Même recette d'authentification que property-add-reel.spec.ts / lot8d-reels-ux.spec.ts : vraie
 * session Firebase (mockFirebaseToken: false), pas juste le cookie NextAuth forgé — la création
 * (POST /api/reels) exige un vrai Bearer ID token, et l'upload vidéo passe par le SDK Storage
 * client (storage.rules).
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-reel-chip-owner-${RUN_ID}`

test.describe('Chip de catégorie direct sur /reels/add — vrai Firestore + Storage', () => {
  test.describe.configure({ mode: 'serial' })

  let videoFixtureDir = ''
  let videoFixture = ''
  let reelId = ''

  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 0)

    videoFixtureDir = await mkdtemp(path.join(tmpdir(), 'e2e-reel-chip-'))
    videoFixture = path.join(videoFixtureDir, 'reel-sans-annonce.mp4')
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
    if (reelId) {
      await deleteReels([{ id: reelId, uid: OWNER_UID }])
    }
    if (videoFixtureDir) {
      await rm(videoFixtureDir, { recursive: true, force: true })
    }
  })

  test('choisit le chip Immobilier sans aucune annonce, publie, et le réel est réellement classé en base', async ({
    page,
  }) => {
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/add?returnTo=%2Freels%2Fmine', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Choisir une vidéo').setInputFiles(videoFixture)

    const publishButton = page.getByRole('button', { name: 'Publier le réel' })
    await expect(publishButton).toBeVisible({ timeout: 15000 })

    const immobilierChip = page.getByRole('button', { name: 'Immobilier', exact: true })
    await expect(immobilierChip).toBeVisible()
    await immobilierChip.click()
    await expect(immobilierChip).toHaveAttribute('aria-pressed', 'true')

    await publishButton.click()

    await expect(page.getByText('Vidéo envoyée', { exact: true })).toBeVisible({ timeout: 30000 })

    // Le client génère l'id du réel lui-même : on ne peut le retrouver qu'en interrogeant par
    // `createdBy` (même limite que property-add-reel.spec.ts).
    await expect.poll(async () => (await findReelByOwner(OWNER_UID))?.id, { timeout: 15000 }).not.toBeUndefined()

    const found = await findReelByOwner(OWNER_UID)
    reelId = found!.id
    const reel = found!.data

    expect(reel.propertyId).toBeFalsy()
    // categoryPath.lvl0 est exactement ce que getPublicReels() filtre pour l'onglet "Immobilier"
    // du fil public (reel.db.ts) — la preuve déterminante, pas juste l'apparence du chip.
    expect(reel.categoryPath).toEqual({ lvl0: 'Immobilier' })
  })
})
