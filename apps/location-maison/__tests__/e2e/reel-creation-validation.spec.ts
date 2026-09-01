import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdtemp, open, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { deleteReels, findReelByOwner, getReel, seedAnnouncerUser } from './helpers/firebase-admin'

const execFileAsync = promisify(execFile)

// Miroir de src/constantes/index.ts (MAX_REEL_RAW_SIZE_BYTES / MAX_REEL_DURATION_SECONDS) —
// pas d'import direct depuis ce fichier de test (hors de l'arborescence Next.js), valeurs
// dupliquées volontairement comme dans les autres specs de ce dossier.
const MAX_REEL_RAW_SIZE_BYTES = 1000 * 1024 * 1024
const MAX_REEL_DURATION_SECONDS = 600

/**
 * Demande directe de l'utilisateur, suite au correctif des limites de réel (voir
 * BUGS-REELS-E2E-2026-08.md, "Limite de durée des réels remontée de 5 à 10 minutes") : couvrir
 * les trois cas du parcours de création d'un réel avec de vrais fichiers vidéo —
 *  1. une vidéo trop lourde (>1 Go) doit afficher un message de refus explicite ;
 *  2. une vidéo trop longue (>10 min) doit afficher un message de refus explicite ;
 *  3. une vidéo dans les deux limites doit réellement être uploadée et publiée avec succès.
 *
 * Cas 1 et 2 : purement côté navigateur (useVideoDropzone.ts vérifie la taille AVANT même de
 * lire la durée, et la durée avant tout upload) — aucun réseau, donc pas besoin d'une vraie
 * session Firebase. Cas 3 : vraie session Firebase requise (comme property-add-reel.spec.ts) —
 * l'upload passe par le SDK Storage CLIENT (request.auth.uid == ownerId, storage.rules).
 *
 * Fichier "trop lourd" du cas 1 : un fichier factice creux (fs.truncate, pas de vraies données
 * vidéo) suffit — le contrôle de taille lit uniquement file.size, jamais le contenu, donc pas
 * besoin d'encoder 1 Go de vraie vidéo (lent, inutile ici).
 *
 * RUN_ID unique par worker (crypto.randomUUID()) : même raison que les autres specs de ce
 * dossier — fullyParallel peut répartir les tests sur des workers séparés.
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-reel-create-validation-${RUN_ID}`
const REEL_DESCRIPTION = `Visite rapide, test de création de réel ${RUN_ID}.`

test.describe('Création d\'un réel — validations taille/durée et publication réelle', () => {
  let fixtureDirectory = ''
  let createdReelId = ''

  async function makeOversizedDummyFile(fileName: string, sizeBytes: number): Promise<string> {
    const outputPath = path.join(fixtureDirectory, fileName)
    const handle = await open(outputPath, 'w')
    try {
      await handle.truncate(sizeBytes)
    } finally {
      await handle.close()
    }
    return outputPath
  }

  async function makeSyntheticVideo(durationSeconds: number, fileName: string): Promise<string> {
    const installerEntry = require.resolve('@ffmpeg-installer/ffmpeg', {
      paths: [path.resolve(process.cwd(), 'functions')],
    })
    const ffmpegPath = (require(installerEntry) as { path: string }).path
    const outputPath = path.join(fixtureDirectory, fileName)
    await execFileAsync(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', `color=c=black:s=64x64:r=2:d=${durationSeconds}`,
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
      '-an', '-movflags', '+faststart',
      outputPath,
    ])
    return outputPath
  }

  test.beforeAll(async () => {
    fixtureDirectory = await mkdtemp(path.join(tmpdir(), 'e2e-reel-create-validation-'))
    await seedAnnouncerUser(OWNER_UID, 0)
  })

  test.afterAll(async () => {
    if (createdReelId) {
      await deleteReels([{ id: createdReelId, uid: OWNER_UID }])
    }
    if (fixtureDirectory) {
      await rm(fixtureDirectory, { recursive: true, force: true })
    }
  })

  test('signale une vidéo trop lourde (>1 Go) sans jamais tenter l\'upload', async ({ page }) => {
    const oversized = await makeOversizedDummyFile('trop-lourde.mp4', MAX_REEL_RAW_SIZE_BYTES + 10 * 1024 * 1024)

    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/add', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Choisir une vidéo').setInputFiles(oversized)

    // .first() : le toast duplique son texte dans une région aria-live pour les lecteurs
    // d'écran (annonce "Vidéo refusée" + le message concaténés) — deux éléments contiennent le
    // texte, seul le premier (le corps visible du toast) est celui qu'on veut vérifier ici.
    await expect(page.getByText('Fichier trop volumineux.').first()).toBeVisible({ timeout: 15000 })
    // Toujours sur l'écran de dépôt (pas passé à l'éditeur) : la vidéo a bien été refusée, pas
    // juste un toast affiché en plus d'une acceptation silencieuse.
    await expect(page.getByLabel('Choisir une vidéo')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Publier le réel' })).toHaveCount(0)
  })

  test('signale une vidéo trop longue (>10 min) sans jamais tenter l\'upload', async ({ page }) => {
    const tooLong = await makeSyntheticVideo(MAX_REEL_DURATION_SECONDS + 5, 'trop-longue.mp4')

    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/add', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Choisir une vidéo').setInputFiles(tooLong)

    // .first() : même duplication aria-live que le cas "trop lourde" ci-dessus.
    await expect(page.getByText('Vidéo trop longue (10 minutes maximum).').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByLabel('Choisir une vidéo')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Publier le réel' })).toHaveCount(0)
  })

  test('publie avec succès une vidéo dans les deux limites (upload + traitement Storage réels)', async ({
    page,
  }) => {
    const validVideo = await makeSyntheticVideo(3, 'video-valide.mp4')

    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/add', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Choisir une vidéo').setInputFiles(validVideo)

    const publishButton = page.getByRole('button', { name: 'Publier le réel' })
    await expect(publishButton).toBeVisible({ timeout: 15000 })
    // Aucun message de refus : preuve que cette vidéo passe bien les deux contrôles (taille et
    // durée) avant même de tenter l'envoi.
    await expect(page.getByText('Fichier trop volumineux.')).toHaveCount(0)
    await expect(page.getByText('Vidéo trop longue', { exact: false })).toHaveCount(0)

    await page.getByPlaceholder('Ajouter une légende...').fill(REEL_DESCRIPTION)
    await publishButton.click()

    // La création (POST /api/reels, Admin SDK) puis l'upload Storage réel (SDK client) prennent
    // plus de temps qu'un simple aller-retour réseau — même remarque que
    // property-add-reel.spec.ts.
    await expect(page.getByText('Vidéo envoyée', { exact: true }).first()).toBeVisible({ timeout: 30000 })

    // Preuve définitive côté données : le document existe réellement en base (le client génère
    // l'id lui-même, on ne peut le retrouver qu'en interrogeant par créateur).
    await expect.poll(async () => (await findReelByOwner(OWNER_UID))?.id, { timeout: 15000 }).not.toBeUndefined()
    const found = await findReelByOwner(OWNER_UID)
    createdReelId = found!.id

    // Pas juste "not failed" ici : preuve complète que le pipeline (upload -> Cloud Function ->
    // transcodage réel) va bien jusqu'au bout pour une vidéo dans les limites.
    await expect
      .poll(async () => (await getReel(createdReelId))?.processingStatus, { timeout: 30000 })
      .toBe('ready')

    const reel = await getReel(createdReelId)
    expect(reel?.moderationStatus).toBe('PENDING')
    expect(reel?.description).toBe(REEL_DESCRIPTION)
    expect(reel?.rawVideoPath).toBe(`reels-raw/${OWNER_UID}/${createdReelId}.mp4`)
    expect(typeof reel?.videoUrl).toBe('string')
    expect(reel?.videoUrl).toBeTruthy()
    expect(reel?.durationSeconds).toBeGreaterThan(0)
    expect(reel?.durationSeconds).toBeLessThanOrEqual(MAX_REEL_DURATION_SECONDS)
  })
})
