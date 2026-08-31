import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { deleteReels, seedAnnouncerUser, seedReel } from './helpers/firebase-admin'

const execFileAsync = promisify(execFile)

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

const PLAYABLE_REEL_ID = `e2e-reels-mine-play-playable-${RUN_ID}`
const PLAYABLE_DESCRIPTION = 'Studio meublé, réel avec une vraie vidéo à lire.'

const PENDING_REEL_ID = `e2e-reels-mine-play-pending-${RUN_ID}`
const PENDING_DESCRIPTION = 'Chambre meublée, réel pas encore approuvé par la modération.'

test.describe('Lire un réel depuis sa miniature sur /reels/mine — vrai Firestore', () => {
  let fixtureDirectory = ''

  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 0)
    await seedReel(OWNER_UID, { id: READY_REEL_ID, description: READY_DESCRIPTION })
    await seedReel(OWNER_UID, {
      id: PROCESSING_REEL_ID,
      description: PROCESSING_DESCRIPTION,
      processingStatus: 'processing',
      moderationStatus: 'PENDING',
    })

    // Vraie vidéo jouable, embarquée en data: URI (pas d'upload Storage réel ni de dépendance
    // réseau externe) — même génération ffmpeg que property-add-reel.spec.ts/
    // lot8d-reels-ux.spec.ts, 1s pour boucler vite et garder le test rapide.
    fixtureDirectory = await mkdtemp(path.join(tmpdir(), 'e2e-reels-mine-play-'))
    const videoFixture = path.join(fixtureDirectory, 'visite.mp4')
    const installerEntry = require.resolve('@ffmpeg-installer/ffmpeg', {
      paths: [path.resolve(process.cwd(), 'functions')],
    })
    const ffmpegPath = (require(installerEntry) as { path: string }).path
    await execFileAsync(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'testsrc2=s=360x640:r=24:d=1',
      '-f', 'lavfi', '-i', 'sine=frequency=660:duration=1',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-shortest', '-movflags', '+faststart',
      videoFixture,
    ])
    const videoBase64 = (await readFile(videoFixture)).toString('base64')
    await seedReel(OWNER_UID, {
      id: PLAYABLE_REEL_ID,
      description: PLAYABLE_DESCRIPTION,
      videoUrl: `data:video/mp4;base64,${videoBase64}`,
    })
    // moderationStatus 'PENDING' + processingStatus 'ready' (par défaut de seedReel) : reproduit
    // exactement le bug rapporté (BUGS-REELS-E2E-2026-08.md) — le propriétaire d'un réel pas
    // encore approuvé par la modération doit quand même pouvoir le relire depuis /reels/mine.
    await seedReel(OWNER_UID, {
      id: PENDING_REEL_ID,
      description: PENDING_DESCRIPTION,
      moderationStatus: 'PENDING',
      videoUrl: `data:video/mp4;base64,${videoBase64}`,
    })
  })

  test.afterAll(async () => {
    await deleteReels([
      { id: READY_REEL_ID, uid: OWNER_UID },
      { id: PROCESSING_REEL_ID, uid: OWNER_UID },
      { id: PLAYABLE_REEL_ID, uid: OWNER_UID },
      { id: PENDING_REEL_ID, uid: OWNER_UID },
    ])
    if (fixtureDirectory) {
      await rm(fixtureDirectory, { recursive: true, force: true })
    }
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

    // ?returnTo=... est désormais ajouté par MyReelsClient.tsx (voir les tests plus bas pour la
    // vérification du retour vers /reels/mine que ce paramètre permet).
    await expect(page).toHaveURL(new RegExp(`/reels/${READY_REEL_ID}(\\?|$)`))
    await expect(page.getByRole('heading', { name: 'Application error', exact: false })).not.toBeVisible()
    await expect(page.getByText('n\'est plus disponible')).not.toBeVisible()
    // Preuve qu'on est bien sur LE bon réel, pas juste une page qui ne plante pas.
    await expect(page.getByText(READY_DESCRIPTION)).toBeVisible({ timeout: 15000 })
  })

  test('la vidéo se lit intégralement (boucle en entier), puis "Voir plus de réels" ramène sur /reels/mine', async ({
    page,
  }) => {
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/mine', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(PLAYABLE_DESCRIPTION)).toBeVisible({ timeout: 20000 })

    const card = page
      .getByText(PLAYABLE_DESCRIPTION)
      .locator('xpath=ancestor::div[contains(@class,"flex h-full flex-col")][1]')
    await card.getByRole('link', { name: 'Lire le réel' }).click()

    await expect(page).toHaveURL(new RegExp(`/reels/${PLAYABLE_REEL_ID}\\?returnTo=`))
    await expect(page.getByText(PLAYABLE_DESCRIPTION)).toBeVisible({ timeout: 15000 })

    // Signalé le 2026-08-31 : la navbar sticky + la barre de navigation mobile fixed ajoutent
    // leur propre hauteur en plus du conteneur vidéo en h-[100dvh], provoquant un scroll de page
    // au lieu d'un rendu figé plein écran. Les deux doivent être absentes sur cette page.
    await expect(page.getByLabel('Accueil - Trouve Ton Nkama')).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'Navigation mobile' })).toHaveCount(0)
    const hasPageScroll = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight + 1,
    )
    expect(hasPageScroll).toBe(false)

    const video = page.locator('video')
    await expect(video).toBeVisible()
    // isActive appelle video.play() dans un effet (ReelSlide, muted au départ) — laisse le
    // temps au navigateur de vraiment démarrer la lecture avant de mesurer.
    await expect
      .poll(async () => video.evaluate((el: HTMLVideoElement) => el.paused), { timeout: 10000 })
      .toBe(false)

    // La vidéo dure 1s et boucle (attribut `loop` sur ReelSlide) : en échantillonnant
    // currentTime sur une fenêtre plus longue que sa durée totale, une lecture qui va bien
    // jusqu'au bout redémarre à 0 — observable comme une VALEUR QUI DIMINUE entre deux
    // échantillons. Une vidéo figée ou qui ne boucle pas ne produirait jamais cette baisse.
    const samples: number[] = []
    for (let i = 0; i < 8; i += 1) {
      samples.push(await video.evaluate((el: HTMLVideoElement) => el.currentTime))
      await page.waitForTimeout(400)
    }
    const loopedAtLeastOnce = samples.some((value, index) => index > 0 && value < samples[index - 1])
    expect(loopedAtLeastOnce).toBe(true)
    expect(await video.evaluate((el: HTMLVideoElement) => el.ended)).toBe(false)

    await page.getByRole('link', { name: 'Voir plus de réels' }).click()

    // /reels/mine, pas /reels (fil public) : c'est bien la page d'où on est parti qui doit
    // revenir, pas le repli par défaut du lien profond WhatsApp.
    await expect(page).toHaveURL(/\/reels\/mine$/)
    await expect(page.getByRole('heading', { name: 'Mes réels' })).toBeVisible()
    await expect(page.getByText(PLAYABLE_DESCRIPTION)).toBeVisible({ timeout: 15000 })
  })

  test('la miniature d\'un réel encore en traitement n\'est pas cliquable', async ({ page }) => {
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/mine', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(PROCESSING_DESCRIPTION)).toBeVisible({ timeout: 20000 })

    const card = page
      .getByText(PROCESSING_DESCRIPTION)
      .locator('xpath=ancestor::div[contains(@class,"flex h-full flex-col")][1]')
    // Tant que processingStatus !== 'ready', il n'y a pas encore de vidéo à lire (peu importe
    // moderationStatus) — un lien "Lire le réel" ici n'aurait rien à afficher.
    await expect(card.getByRole('link', { name: 'Lire le réel' })).toHaveCount(0)
  })

  test('le propriétaire peut lire son propre réel pas encore approuvé par la modération', async ({ page }) => {
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/mine', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(PENDING_DESCRIPTION)).toBeVisible({ timeout: 20000 })

    const card = page
      .getByText(PENDING_DESCRIPTION)
      .locator('xpath=ancestor::div[contains(@class,"flex h-full flex-col")][1]')
    // processingStatus 'ready' rend la miniature cliquable même si moderationStatus est
    // 'PENDING' — seule la visibilité PUBLIQUE dépend de l'approbation, pas le droit du
    // créateur de relire son propre réel (voir /api/reels/[reelId]/route.ts).
    await card.getByRole('link', { name: 'Lire le réel' }).click()

    await expect(page).toHaveURL(new RegExp(`/reels/${PENDING_REEL_ID}\\?returnTo=`))
    // Le bug rapporté : "Ce réel n'est plus disponible ou n'a pas encore été approuvé" ne doit
    // JAMAIS s'afficher au propriétaire sur son propre réel, approuvé ou non.
    await expect(page.getByText('n\'est plus disponible')).not.toBeVisible()
    await expect(page.getByText(PENDING_DESCRIPTION)).toBeVisible({ timeout: 15000 })

    const video = page.locator('video')
    await expect(video).toBeVisible()
    await expect
      .poll(async () => video.evaluate((el: HTMLVideoElement) => el.paused), { timeout: 10000 })
      .toBe(false)
  })
})
