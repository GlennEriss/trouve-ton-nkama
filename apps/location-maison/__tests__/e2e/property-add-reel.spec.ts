import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import { expect, test, type Page } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import {
  deleteProperties,
  deleteReels,
  findReelByOwner,
  seedAnnouncerUser,
  seedProperties,
  type SeedProperty,
} from './helpers/firebase-admin'

const execFileAsync = promisify(execFile)

/**
 * Parcours complet "Ajouter un réel" depuis /property : clique le lien sur la carte d'une
 * annonce -> arrive sur /reels/add?propertyId={id} -> upload une vraie vidéo -> publie -> vérifie
 * la vraie persistance Firestore (Admin SDK, pas juste le toast) -> vérifie l'apparition sur
 * /reels/mine.
 *
 * Vraie session Firebase requise (pas juste le cookie NextAuth forgé) : la création d'un réel
 * (createReel -> POST /api/reels) authentifie par Bearer ID token Firebase
 * (adminAuth.verifyIdToken), et l'upload vidéo (uploadRawReelVideo) passe par le SDK Storage
 * CLIENT, qui exige request.auth.uid == ownerId (storage.rules). Le pont entre la session
 * NextAuth forgée et une vraie session Firebase passe par POST /api/generate-token (mint un
 * custom token pour l'uid de la session) -> signInWithCustomToken côté client
 * (connectFirebaseClient dans use-current-user.ts) — d'où mockCommonAppNoise(page, {
 * mockFirebaseToken: false }), qui laisse cet appel réel passer au lieu de le mocker (mock par
 * défaut ailleurs dans la suite, où aucune écriture Firestore/Storage réelle n'est nécessaire).
 * Même recette que lot8d-reels-ux.spec.ts.
 *
 * RUN_ID unique par worker (crypto.randomUUID()) : même raison que les autres specs de ce
 * dossier — fullyParallel peut répartir les tests sur des workers séparés.
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-add-reel-owner-${RUN_ID}`
const PROPERTY_ID = `e2e-add-reel-villa-${RUN_ID}`
const REEL_DESCRIPTION = 'Visite rapide de la villa, jardin et piscine.'

const PROPERTY: SeedProperty = {
  id: PROPERTY_ID,
  title: 'Villa test ajout de réel E2E',
  description: 'Villa de test pour le parcours Ajouter un réel.',
  typeProperty: 'Villa',
  status: 'FOR_SALE',
  state: 'IN_PROGRESS',
  moderationStatus: 'APPROVED',
  price: 3000000,
  area: 200,
  province: 'Estuaire',
  city: 'Libreville',
  street: 'Rue de test',
  latitude: 0.4162,
  longitude: 9.4673,
}

async function gotoPropertyAndClickAjouterUnReel(page: Page) {
  await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
  await mockCommonAppNoise(page, { mockFirebaseToken: false })
  await page.goto('/property', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Gestion des annonces' })).toBeVisible()
  await expect(page.getByText(PROPERTY.title)).toBeVisible()

  const card = page
    .locator('h3', { hasText: PROPERTY.title })
    .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
  await card.getByRole('link', { name: 'Ajouter un réel' }).click()
}

test.describe('Ajouter un réel depuis /property — vrai Firestore + Storage', () => {
  test.describe.configure({ mode: 'serial' })

  let videoFixtureDir = ''
  let videoFixture = ''
  let reelId = ''

  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 0)
    await seedProperties(OWNER_UID, [PROPERTY])

    videoFixtureDir = await mkdtemp(path.join(tmpdir(), 'e2e-add-reel-'))
    videoFixture = path.join(videoFixtureDir, 'visite-villa.mp4')
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
    await deleteProperties([PROPERTY_ID])
    if (videoFixtureDir) {
      await rm(videoFixtureDir, { recursive: true, force: true })
    }
  })

  test('clique "Ajouter un réel" sur la carte, arrive sur /reels/add avec la bonne annonce présélectionnée', async ({
    page,
  }) => {
    await gotoPropertyAndClickAjouterUnReel(page)

    await expect(page).toHaveURL(new RegExp(`/reels/add\\?propertyId=${PROPERTY_ID}$`))
    await expect(page.getByRole('heading', { name: 'Créer un réel' })).toBeVisible()
    // Confirme que la présélection de l'annonce (via ?propertyId=) est bien reflétée dans l'UI,
    // pas juste dans l'URL.
    await expect(
      page.getByText(`Pour l'annonce « ${PROPERTY.title} »`, { exact: false }),
    ).toBeVisible({ timeout: 15000 })
  })

  test('upload une vraie vidéo, publie, et le réel est réellement créé en base rattaché à l\'annonce', async ({
    page,
  }) => {
    await gotoPropertyAndClickAjouterUnReel(page)
    await expect(page.getByRole('heading', { name: 'Créer un réel' })).toBeVisible()

    await page.getByLabel('Choisir une vidéo').setInputFiles(videoFixture)

    // Éditeur plein écran : confirme l'annonce présélectionnée affichée sur la vidéo elle-même,
    // pas seulement sur l'écran précédent.
    await expect(page.getByText(`Pour « ${PROPERTY.title} »`, { exact: false })).toBeVisible({
      timeout: 15000,
    })

    const publishButton = page.getByRole('button', { name: 'Publier le réel' })
    await expect(publishButton).toBeVisible()

    await page.getByPlaceholder('Ajouter une légende...').fill(REEL_DESCRIPTION)
    await publishButton.click()

    // La création (POST /api/reels, Admin SDK) puis l'upload Storage réel (SDK client) prennent
    // plus de temps qu'un simple aller-retour réseau — la session Firebase (custom token ->
    // signInWithCustomToken) doit aussi avoir eu le temps de s'établir en tâche de fond.
    await expect(page.getByText('Vidéo envoyée', { exact: true })).toBeVisible({ timeout: 30000 })
    // Pas d'assertion sur le libellé précis "Envoi de la vidéo en cours..." : la Cloud Function
    // de transcodage tourne réellement sur cet environnement dev et peut traiter la vidéo assez
    // vite pour que le statut ait déjà avancé (processing/ready) au moment où ce test regarde —
    // constaté en e2e réel (flaky sur ce point précis). Le toast ci-dessus suffit côté UI ; la
    // vraie preuve est la lecture Firestore ci-dessous.

    // Preuve définitive côté données : le document existe réellement en base, correctement
    // rattaché à l'annonce, avec le chemin vidéo attendu (uploadRawReelVideo) — pas juste
    // l'apparence côté UI. Le client génère l'id du réel lui-même : on ne peut le retrouver
    // qu'en interrogeant par `createdBy`.
    await expect.poll(async () => (await findReelByOwner(OWNER_UID))?.id, { timeout: 15000 }).not.toBeUndefined()

    const found = await findReelByOwner(OWNER_UID)
    reelId = found!.id
    const reel = found!.data

    expect(reel.propertyId).toBe(PROPERTY_ID)
    // 'uploading' juste après la publication, mais la Cloud Function de transcodage (réelle sur
    // cet environnement) peut avoir déjà fait avancer le statut avant cette lecture — voir la
    // note ci-dessus. Toute valeur autre que 'failed' prouve que l'upload a bien abouti.
    expect(['uploading', 'processing', 'ready']).toContain(reel.processingStatus)
    expect(reel.moderationStatus).toBe('PENDING')
    expect(reel.description).toBe(REEL_DESCRIPTION)
    expect(reel.rawVideoPath).toBe(`reels-raw/${OWNER_UID}/${reelId}.mp4`)
  })

  test('le réel publié apparaît réellement sur Mes réels, rattaché à l\'annonce', async ({ page }) => {
    test.skip(!reelId, 'Dépend du test de publication précédent (même run, mode serial).')

    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/mine', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Mes réels' })).toBeVisible()
    await expect(page.getByText(REEL_DESCRIPTION)).toBeVisible({ timeout: 20000 })

    const card = page
      .getByText(REEL_DESCRIPTION)
      .locator('xpath=ancestor::div[contains(@class,"flex h-full flex-col")][1]')
    await expect(card.getByText('Attaché à une annonce')).toBeVisible()
  })
})
