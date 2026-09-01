import crypto from 'node:crypto'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { deleteReels, seedAnnouncerUser, seedReel } from './helpers/firebase-admin'

/**
 * Bouton "Mes réels" en haut de /property (Gestion des annonces) — doit emmener vers la vraie
 * page /reels/mine, avec les réels de l'annonceur connecté réellement affichés (pas juste la
 * bonne URL) : le lien lui-même est un simple `<Link href={routes.protected.reels_mine}>`
 * (AdManagementPage.tsx) donc peu à risque de casser, mais /reels/mine (MyReelsClient.tsx)
 * n'affiche ses réels qu'une fois la vraie session Firebase établie (isFirebaseConnected, même
 * pont custom-token que /reels/add — voir BUGS-REELS-E2E-2026-08.md) ; un lien "correct" qui
 * atterrit sur une page qui reste vide ou plantée ne serait pas vraiment "ça marche".
 *
 * RUN_ID unique par worker (crypto.randomUUID()) : même raison que les autres specs de ce
 * dossier — fullyParallel peut répartir les tests sur des workers séparés.
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-my-reels-link-owner-${RUN_ID}`
const REEL_ID = `e2e-my-reels-link-reel-${RUN_ID}`
const REEL_DESCRIPTION = 'Réel de test pour le lien Mes réels.'

test.describe('Bouton "Mes réels" /property -> /reels/mine', () => {
  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 0)
    await seedReel(OWNER_UID, { id: REEL_ID, description: REEL_DESCRIPTION })
  })

  test.afterAll(async () => {
    await deleteReels([{ id: REEL_ID, uid: OWNER_UID }])
  })

  test('clique "Mes réels" depuis /property et affiche réellement les réels de l\'annonceur connecté', async ({
    page,
  }) => {
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/property', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Gestion des annonces' })).toBeVisible()

    // Le lien "Mes réels" de la nav principale (toujours présente) porte le même texte que le
    // bouton propre à cette page — scoper à <main> pour cliquer bien celui de la page.
    await page.getByRole('main').getByRole('link', { name: 'Mes réels' }).click()

    await expect(page).toHaveURL(/\/reels\/mine$/)
    await expect(page.getByRole('heading', { name: 'Mes réels' })).toBeVisible()
    // Pas juste la bonne URL/le bon titre de page : le réel réellement seedé pour CET
    // annonceur doit apparaître dans la liste (preuve que la session Firebase a bien pris et
    // que la requête interroge le bon uid).
    await expect(page.getByText(REEL_DESCRIPTION)).toBeVisible({ timeout: 20000 })
  })
})
