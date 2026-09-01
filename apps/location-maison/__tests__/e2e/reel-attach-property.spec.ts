import crypto from 'node:crypto'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import {
  deleteProperties,
  deleteReels,
  getReel,
  seedAnnouncerUser,
  seedProperties,
  seedReel,
  type SeedProperty,
} from './helpers/firebase-admin'

/**
 * Rattacher un réel orphelin (créé sans annonce, voir CreateOrphanReelClient.tsx) à une annonce
 * a posteriori — bouton "Attacher à une annonce" sur /reels/mine (MyReelsClient.tsx, affiché
 * uniquement quand !reel.propertyId), qui mène à /reels/select-property?attachReelId={id}
 * (SelectPropertyForReelClient.tsx) → PATCH /api/reels action 'attach-property'
 * (attachReelToProperty, reel.db.ts). Aucun test e2e réel n'existait encore pour ce chemin.
 *
 * Vraie session Firebase requise (comme les autres specs de ce dossier) : l'appel PATCH
 * s'authentifie par Bearer ID token Firebase (adminAuth.verifyIdToken), pas seulement le cookie
 * NextAuth forgé.
 *
 * RUN_ID unique par worker (crypto.randomUUID()) : même raison que les autres specs de ce
 * dossier — fullyParallel peut répartir les tests sur des workers séparés.
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-reel-attach-${RUN_ID}`
const REEL_ID = `e2e-reel-attach-reel-${RUN_ID}`
const PROPERTY_ID = `e2e-reel-attach-property-${RUN_ID}`
const REEL_DESCRIPTION = `Réel orphelin à rattacher, run ${RUN_ID}.`

const PROPERTY: SeedProperty = {
  id: PROPERTY_ID,
  title: `Villa test rattachement de réel ${RUN_ID}`,
  description: 'Villa de test pour le parcours de rattachement de réel.',
  typeProperty: 'Villa',
  status: 'FOR_SALE',
  state: 'IN_PROGRESS',
  moderationStatus: 'APPROVED',
  price: 3_000_000,
  area: 200,
  province: 'Estuaire',
  city: 'Libreville',
  street: 'Rue de test',
  latitude: 0.4162,
  longitude: 9.4673,
}

test.describe('Attacher un réel orphelin à une annonce depuis /reels/mine — vrai Firestore', () => {
  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 0)
    await seedProperties(OWNER_UID, [PROPERTY])
    // propertyId reste null par défaut (voir seedReel) : c'est justement l'état "orphelin" que
    // ce test doit pouvoir rattacher.
    await seedReel(OWNER_UID, { id: REEL_ID, description: REEL_DESCRIPTION })
  })

  test.afterAll(async () => {
    await deleteReels([{ id: REEL_ID, uid: OWNER_UID }])
    await deleteProperties([PROPERTY_ID])
  })

  test('clique "Attacher à une annonce", choisit l\'annonce, et le rattachement est réellement écrit en base', async ({
    page,
  }) => {
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/mine', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText(REEL_DESCRIPTION)).toBeVisible({ timeout: 20000 })
    const card = page
      .getByText(REEL_DESCRIPTION)
      .locator('xpath=ancestor::div[contains(@class,"flex h-full flex-col")][1]')
    await expect(card.getByText('Pas encore attaché à une annonce')).toBeVisible()

    await card.getByRole('link', { name: 'Attacher à une annonce' }).click()

    await expect(page).toHaveURL(new RegExp(`/reels/select-property\\?attachReelId=${REEL_ID}$`))
    await expect(page.getByRole('heading', { name: "Choisir l'annonce à attacher" })).toBeVisible()
    await expect(page.getByText(PROPERTY.title)).toBeVisible({ timeout: 15000 })

    const propertyCard = page
      .getByText(PROPERTY.title)
      .locator('xpath=ancestor::div[contains(@class,"cursor-pointer")][1]')
    await propertyCard.click()

    await expect(page.getByText('Réel rattaché', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/\/reels\/mine$/, { timeout: 15000 })

    // Preuve définitive côté données, pas juste l'apparence du toast : le champ propertyId a
    // réellement été écrit sur le document reels/{id}.
    await expect.poll(async () => (await getReel(REEL_ID))?.propertyId, { timeout: 15000 }).toBe(PROPERTY_ID)

    // Et le reflet dans l'UI après le retour sur /reels/mine, pas seulement en base : la carte
    // affiche désormais "Attaché" et le bouton de rattachement a disparu (il n'a plus de sens,
    // un réel ne peut être rattaché qu'une fois — voir REEL_ALREADY_ATTACHED côté API).
    await expect(page.getByText(REEL_DESCRIPTION)).toBeVisible({ timeout: 15000 })
    const cardAfter = page
      .getByText(REEL_DESCRIPTION)
      .locator('xpath=ancestor::div[contains(@class,"flex h-full flex-col")][1]')
    await expect(cardAfter.getByText('Attaché à une annonce', { exact: true })).toBeVisible()
    await expect(cardAfter.getByRole('link', { name: 'Attacher à une annonce' })).toHaveCount(0)
  })
})
