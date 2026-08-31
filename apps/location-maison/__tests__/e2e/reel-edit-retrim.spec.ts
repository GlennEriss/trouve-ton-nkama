import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { deleteReels, getReel, seedAnnouncerUser, seedReel } from './helpers/firebase-admin'

const execFileAsync = promisify(execFile)

/**
 * Demande directe de l'utilisateur : la page d'édition d'un réel (/reels/{id}/edit) n'avait pas
 * la barre de montage disponible à la création — "il n'y a que" contact/description. Le
 * propriétaire doit pouvoir recouper un réel déjà publié, exactement comme à la création.
 *
 * Vraie session Firebase + vrai Storage + vraie Cloud Function requis (pas de mock) : le montage
 * réenvoie la vidéo déjà publiée (récupérée en Blob depuis videoUrl) comme nouveau "brut" vers
 * reels-raw/, ce qui déclenche à nouveau transcodeReelVideo (même Cloud Function, réellement
 * active sur cet environnement dev, voir property-add-reel.spec.ts/lot8d-reels-ux.spec.ts) — la
 * seule preuve honnête que le montage a été appliqué est une durée réellement plus courte après
 * un nouveau traitement complet, pas juste un état local React.
 *
 * Vidéo initiale en `data:` URI (comme reels-mine-play.spec.ts) : évite un vrai upload Storage
 * pour l'état de départ "déjà publié" — EditReelClient la récupère par un simple fetch(), qui
 * fonctionne aussi bien sur un data: URI que sur une URL Storage réelle.
 *
 * RUN_ID unique par worker (crypto.randomUUID()) : même raison que les autres specs de ce
 * dossier — fullyParallel peut répartir les tests sur des workers séparés.
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-reel-retrim-${RUN_ID}`
const REEL_ID = `e2e-reel-retrim-reel-${RUN_ID}`
const ORIGINAL_DESCRIPTION = 'Studio meublé, à recouper pendant le test.'
const SOURCE_DURATION_SECONDS = 3

test.describe('Recouper un réel déjà publié depuis /reels/{id}/edit — vrai Storage + Cloud Function', () => {
  let fixtureDirectory = ''

  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 0)

    fixtureDirectory = await mkdtemp(path.join(tmpdir(), 'e2e-reel-retrim-'))
    const videoFixture = path.join(fixtureDirectory, 'visite.mp4')
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
    const videoBase64 = (await readFile(videoFixture)).toString('base64')

    await seedReel(OWNER_UID, {
      id: REEL_ID,
      description: ORIGINAL_DESCRIPTION,
      videoUrl: `data:video/mp4;base64,${videoBase64}`,
    })
  })

  test.afterAll(async () => {
    await deleteReels([{ id: REEL_ID, uid: OWNER_UID }])
    if (fixtureDirectory) {
      await rm(fixtureDirectory, { recursive: true, force: true })
    }
  })

  test('la barre de montage est disponible en édition et une découpe est réellement appliquée après retraitement', async ({
    page,
  }) => {
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto(`/reels/${REEL_ID}/edit`, { waitUntil: 'domcontentloaded' })

    const contactToggle = page.getByRole('button', { name: /Contact :|Ajouter un numéro/i })
    await expect(contactToggle).toBeVisible({ timeout: 20000 })

    // Preuve que la vidéo déjà publiée a bien été récupérée et chargée dans le même éditeur de
    // montage qu'à la création (VideoTrimEditor) — pas juste le lecteur simple d'avant.
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
      .poll(async () => (await getReel(REEL_ID))?.processingStatus, { timeout: 45000 })
      .toBe('ready')

    const reel = await getReel(REEL_ID)
    expect(reel?.durationSeconds).toBeLessThan(SOURCE_DURATION_SECONDS)
    expect(reel?.durationSeconds).toBeGreaterThan(0)
    expect(reel?.trimEndSeconds).toBeLessThan(SOURCE_DURATION_SECONDS)
    expect(reel?.rawVideoPath).toBe(`reels-raw/${OWNER_UID}/${REEL_ID}.mp4`)
    // L'URL vidéo a bien changé (nouveau fichier transcodé), pas juste conservé le data: URI
    // d'origine.
    expect(typeof reel?.videoUrl).toBe('string')
    expect(reel?.videoUrl as string).not.toContain('data:video')
  })
})
