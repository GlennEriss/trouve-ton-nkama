import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { deleteReels, findReelByOwner, getReel, seedAnnouncerUser } from './helpers/firebase-admin'

const execFileAsync = promisify(execFile)

/**
 * Demande directe de l'utilisateur : la page d'édition d'un réel (/reels/{id}/edit) n'avait pas
 * la barre de montage disponible à la création — "il n'y a que" contact/description. Le
 * propriétaire doit pouvoir recouper un réel déjà publié, exactement comme à la création.
 *
 * Vraie session Firebase + vrai Storage + vraie Cloud Function requis (pas de mock), à DEUX
 * reprises : une fois pour publier un premier réel réel (comme property-add-reel.spec.ts), une
 * seconde fois pour le nouveau montage envoyé depuis l'édition. Un premier essai de cette suite
 * avec une vidéo de départ en `data:` URI (raccourci pratique, pas d'upload initial nécessaire)
 * a laissé passer un vrai bug : le fetch(reel.videoUrl) direct depuis le navigateur échoue en
 * CORS sur une vraie URL Firebase Storage (le bucket n'a aucune configuration CORS) — un `data:`
 * URI n'a aucune restriction CORS, donc ce raccourci masquait exactement le bug que l'utilisateur
 * a fini par voir en vrai ("aucune barre de montage en édition"). Corrigé côté app par un proxy
 * serveur (/api/reels/[reelId]/video, Admin SDK) plutôt qu'une configuration CORS sur le bucket.
 * Ce test part donc d'un réel RÉELLEMENT publié via Storage, pour exercer le même chemin que la
 * vraie application et ne plus jamais recréer ce blind spot.
 *
 * RUN_ID unique par worker (crypto.randomUUID()) : même raison que les autres specs de ce
 * dossier — fullyParallel peut répartir les tests sur des workers séparés.
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-reel-retrim-${RUN_ID}`
const ORIGINAL_DESCRIPTION = `Studio meublé, à recouper pendant le test ${RUN_ID}.`
const SOURCE_DURATION_SECONDS = 3

test.describe('Recouper un réel déjà publié depuis /reels/{id}/edit — vrai Storage + Cloud Function', () => {
  test.describe.configure({ mode: 'serial' })

  let fixtureDirectory = ''
  let videoFixture = ''
  let reelId = ''

  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 0)

    fixtureDirectory = await mkdtemp(path.join(tmpdir(), 'e2e-reel-retrim-'))
    videoFixture = path.join(fixtureDirectory, 'visite.mp4')
    const installerEntry = require.resolve('@ffmpeg-installer/ffmpeg', {
      paths: [path.resolve(process.cwd(), 'functions')],
    })
    const ffmpegPath = (require(installerEntry) as { path: string }).path
    await execFileAsync(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', `testsrc2=s=360x640:r=24:d=${SOURCE_DURATION_SECONDS}`,
      '-f', 'lavfi', '-i', `sine=frequency=660:duration=${SOURCE_DURATION_SECONDS}`,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-shortest', '-movflags', '+faststart',
      videoFixture,
    ])
  })

  test.afterAll(async () => {
    if (reelId) {
      await deleteReels([{ id: reelId, uid: OWNER_UID }])
    }
    if (fixtureDirectory) {
      await rm(fixtureDirectory, { recursive: true, force: true })
    }
  })

  test('publie un premier réel réel (upload + traitement Storage réels)', async ({ page }) => {
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/add', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Choisir une vidéo').setInputFiles(videoFixture)
    const publishButton = page.getByRole('button', { name: 'Publier le réel' })
    await expect(publishButton).toBeVisible({ timeout: 15000 })
    await page.getByPlaceholder('Ajouter une légende...').fill(ORIGINAL_DESCRIPTION)
    await publishButton.click()

    await expect(page.getByText('Vidéo envoyée', { exact: true })).toBeVisible({ timeout: 30000 })

    await expect.poll(async () => (await findReelByOwner(OWNER_UID))?.id, { timeout: 15000 }).not.toBeUndefined()
    const found = await findReelByOwner(OWNER_UID)
    reelId = found!.id

    // Pas juste "not failed" : ce réel doit vraiment finir 'ready' avec un videoPath Storage
    // réel, c'est la condition que /api/reels/[reelId]/video (le proxy) exige pour servir des
    // octets — le test suivant en dépend directement.
    await expect
      .poll(async () => (await getReel(reelId))?.processingStatus, { timeout: 30000 })
      .toBe('ready')
    const publishedReel = await getReel(reelId)
    expect(typeof publishedReel?.videoPath).toBe('string')
    expect(publishedReel?.videoPath).toBeTruthy()
  })

  test('la barre de montage est disponible en édition et une découpe est réellement appliquée après retraitement', async ({
    page,
  }) => {
    test.skip(!reelId, 'Dépend du test de publication précédent (même run, mode serial).')

    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto(`/reels/${reelId}/edit`, { waitUntil: 'domcontentloaded' })

    const contactToggle = page.getByRole('button', { name: /Contact :|Ajouter un numéro/i })
    await expect(contactToggle).toBeVisible({ timeout: 20000 })

    // Preuve que la vidéo déjà publiée a bien été récupérée (via le proxy serveur, pas un fetch
    // direct qui échouerait en CORS) et chargée dans le même éditeur de montage qu'à la création
    // (VideoTrimEditor) — pas juste le lecteur simple d'avant.
    const trimBar = page.getByTestId('reel-trim-bar')
    await expect(trimBar).toBeVisible({ timeout: 20000 })
    await expect(page.getByLabel('Couper le son')).toBeVisible()

    const trimBarBox = await trimBar.boundingBox()
    const endHandle = page.getByTestId('reel-trim-handle-end')
    const endHandleBox = await endHandle.boundingBox()
    if (!trimBarBox || !endHandleBox) {
      throw new Error('Barre de montage introuvable pour le drag.')
    }

    // Glisse la poignée de fin de ~100% à ~50% de la barre : coupe la vidéo de 3s à ~1.5s.
    // La poignée est centrée exactement sur le bord droit de la barre (left: 100%,
    // -translate-x-1/2) : sa moitié droite dépasse la barre et est rognée par l'overflow-hidden
    // du conteneur (invisible et hors zone cliquable), même si boundingBox() la rapporte quand
    // même en entier — cliquer à 25% de sa largeur reste dans la moitié gauche, réellement
    // visible et cliquable.
    const startX = endHandleBox.x + endHandleBox.width * 0.25
    const startY = endHandleBox.y + endHandleBox.height / 2
    const targetX = trimBarBox.x + trimBarBox.width * 0.5

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(targetX, startY, { steps: 10 })
    await page.mouse.up()

    const saveButton = page.getByRole('button', { name: 'Enregistrer les modifications' })
    await expect(saveButton).toBeEnabled()
    await saveButton.click()

    await expect(page).toHaveURL(/\/reels\/mine$/, { timeout: 20000 })

    // Pas d'assertion intermédiaire sur un statut 'uploading'/'processing' : la Cloud Function
    // (réelle sur cet environnement dev) peut traiter une vidéo aussi courte plus vite que ce
    // test ne l'observe, ce qui rendrait un tel contrôle intermittent — constaté et déjà
    // documenté sur ce même pattern dans property-add-reel.spec.ts. La preuve définitive est le
    // résultat final ci-dessous, jamais un état transitoire.

    // Preuve définitive, côté données : une fois le retraitement terminé, la durée du réel est
    // réellement plus courte que la vidéo source (3s) — pas juste un état local React qui
    // n'aurait jamais été appliqué au fichier.
    await expect
      .poll(async () => (await getReel(reelId))?.processingStatus, { timeout: 45000 })
      .toBe('ready')

    const reel = await getReel(reelId)
    expect(reel?.durationSeconds).toBeLessThan(SOURCE_DURATION_SECONDS)
    expect(reel?.durationSeconds).toBeGreaterThan(0)
    expect(reel?.trimEndSeconds).toBeLessThan(SOURCE_DURATION_SECONDS)
    expect(reel?.rawVideoPath).toBe(`reels-raw/${OWNER_UID}/${reelId}.mp4`)
  })
})
