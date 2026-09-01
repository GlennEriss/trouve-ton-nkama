import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'

const execFileAsync = promisify(execFile)

/**
 * Demande directe de l'utilisateur : une vendeuse a reçu une erreur en créant un réel, soupçon
 * d'une limite de taille/durée trop stricte (5 min à l'époque) — remontée à 10 minutes
 * (MAX_REEL_DURATION_SECONDS, src/constantes/index.ts ; miroir côté Cloud Function,
 * REEL_MAX_DURATION_SECONDS, functions/src/reels/config.ts).
 *
 * Ce test ne vérifie que le filtre CÔTÉ NAVIGATEUR (useVideoDropzone.ts) — avant tout upload,
 * donc rapide et sans dépendance Storage/Cloud Function : suffisant pour prouver que le nouveau
 * seuil de 10 minutes est bien celui appliqué, ni plus court (l'ancien 5 min encore actif par
 * erreur) ni absent (aucune limite du tout). Vidéos synthétiques à très faible bitrate/résolution
 * (quelques Ko malgré une durée de 10 min) : rapides à générer, aucun upload réel nécessaire ici.
 */
test.describe('Limite de durée des réels (10 minutes) — vrai navigateur', () => {
  let fixtureDirectory = ''

  async function makeLongSyntheticVideo(durationSeconds: number, fileName: string): Promise<string> {
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
    fixtureDirectory = await mkdtemp(path.join(tmpdir(), 'e2e-reel-duration-'))
  })

  test.afterAll(async () => {
    if (fixtureDirectory) {
      await rm(fixtureDirectory, { recursive: true, force: true })
    }
  })

  test('refuse une vidéo de 10 minutes et 5 secondes (juste au-dessus du nouveau plafond)', async ({ page }) => {
    const videoFixture = await makeLongSyntheticVideo(605, 'trop-longue.mp4')

    await signInAsAnnouncer(page.context(), 'http://localhost:3000', E2E_ANNOUNCER)
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/add', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Choisir une vidéo').setInputFiles(videoFixture)

    await expect(page.getByText('Vidéo trop longue (10 minutes maximum).')).toBeVisible({ timeout: 15000 })
    // Toujours sur l'écran de dépôt (pas passé à l'éditeur) : la vidéo a bien été refusée, pas
    // juste un toast affiché en plus d'une acceptation silencieuse.
    await expect(page.getByLabel('Choisir une vidéo')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Publier le réel' })).toHaveCount(0)
  })

  test('accepte une vidéo de 9 min 55 (au-delà de l\'ancien plafond de 5 minutes, sous le nouveau)', async ({
    page,
  }) => {
    const videoFixture = await makeLongSyntheticVideo(595, 'longue-mais-acceptee.mp4')

    await signInAsAnnouncer(page.context(), 'http://localhost:3000', E2E_ANNOUNCER)
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/add', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Choisir une vidéo').setInputFiles(videoFixture)

    // Preuve que le seuil a bien été relevé (pas resté bloqué à l'ancien 5 min) : passe à
    // l'éditeur de montage, aucun toast de refus.
    await expect(page.getByRole('button', { name: 'Publier le réel' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Vidéo trop longue', { exact: false })).toHaveCount(0)
  })
})
