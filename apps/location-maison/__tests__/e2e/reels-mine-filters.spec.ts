import crypto from 'node:crypto'

import { expect, test, type Page } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { deleteReels, seedAnnouncerUser, seedReel } from './helpers/firebase-admin'

/**
 * Filtres de /reels/mine (recherche + bouton "Filtres"), uniformisés le 2026-08-30 sur le même
 * design que /property (AdManagementPage.tsx) — voir BUGS-REELS-E2E-2026-08.md. Vraie session
 * Firebase requise pour que MyReelsClient.tsx charge réellement les réels de l'annonceur
 * (isFirebaseConnected, même pont custom-token que le reste des specs Réels).
 *
 * Sélecteurs par id plutôt que getByLabel/getByPlaceholder pour les champs recherche/date :
 * les blocs mobile et desktop sont TOUS LES DEUX dans le DOM en permanence (seul le CSS
 * `md:hidden`/`hidden md:block` cache l'un ou l'autre selon le viewport) — Playwright compte les
 * éléments masqués en display:none dans la résolution stricte d'un locator (constaté en e2e réel
 * sur ce même type de duplication, voir lot4-mobile-announcer.spec.ts), donc getByLabel('Recherche')
 * ou getByPlaceholder(...) matcheraient les deux à la fois selon le test.
 *
 * RUN_ID unique par worker (crypto.randomUUID()) : même raison que les autres specs de ce
 * dossier — fullyParallel peut répartir les tests sur des workers séparés.
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-reels-mine-filters-${RUN_ID}`

const VILLA_REEL_ID = `e2e-reels-mine-filters-villa-${RUN_ID}`
const STUDIO_REEL_ID = `e2e-reels-mine-filters-studio-${RUN_ID}`
const VILLA_DESCRIPTION = 'Villa avec piscine et jardin, quartier calme.'
const STUDIO_DESCRIPTION = 'Studio meublé proche du centre-ville.'

async function gotoMyReels(page: Page) {
  await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
  await mockCommonAppNoise(page, { mockFirebaseToken: false })
  await page.goto('/reels/mine', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Mes réels' })).toBeVisible()
  await expect(page.getByText(VILLA_DESCRIPTION)).toBeVisible({ timeout: 20000 })
  await expect(page.getByText(STUDIO_DESCRIPTION)).toBeVisible()
}

test.describe('Filtres /reels/mine — vrai Firestore, même design que /property', () => {
  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 0)
    await seedReel(OWNER_UID, { id: VILLA_REEL_ID, description: VILLA_DESCRIPTION })
    await seedReel(OWNER_UID, { id: STUDIO_REEL_ID, description: STUDIO_DESCRIPTION })
  })

  test.afterAll(async () => {
    await deleteReels([
      { id: VILLA_REEL_ID, uid: OWNER_UID },
      { id: STUDIO_REEL_ID, uid: OWNER_UID },
    ])
  })

  test.describe('Desktop', () => {
    test.use({ viewport: { width: 1440, height: 960 } })

    test('la recherche filtre les réels par description en temps réel', async ({ page }) => {
      await gotoMyReels(page)

      await page.locator('#reels-search').fill('piscine')
      await expect(page.getByText(VILLA_DESCRIPTION)).toBeVisible()
      await expect(page.getByText(STUDIO_DESCRIPTION)).not.toBeVisible()

      // Le bouton "Effacer" existe en double dans le DOM (même condition `searchInput`
      // partagée par les blocs mobile ET desktop) — scope au conteneur du champ desktop.
      const searchWrapper = page.locator('#reels-search').locator('xpath=ancestor::div[contains(@class,"relative")][1]')
      await searchWrapper.getByRole('button', { name: 'Effacer la recherche' }).click()
      await expect(page.locator('#reels-search')).toHaveValue('')
      await expect(page.getByText(STUDIO_DESCRIPTION)).toBeVisible()
    })

    test('une recherche sans résultat affiche l\'état vide dédié, "Réinitialiser" le résout', async ({
      page,
    }) => {
      await gotoMyReels(page)

      await page.locator('#reels-search').fill('zzz-introuvable-zzz')
      await expect(page.getByRole('heading', { name: 'Aucun réel ne correspond à vos filtres' })).toBeVisible()
      await expect(page.getByText(VILLA_DESCRIPTION)).not.toBeVisible()

      await page.getByRole('button', { name: 'Réinitialiser les filtres' }).click()
      await expect(page.getByText(VILLA_DESCRIPTION)).toBeVisible()
      await expect(page.getByText(STUDIO_DESCRIPTION)).toBeVisible()
    })
  })

  test.describe('Mobile', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('le Sheet de filtres applique une période qui exclut tout, "Réinitialiser" restaure la liste', async ({
      page,
    }) => {
      await gotoMyReels(page)

      await page.getByRole('button', { name: 'Filtres' }).click()
      const sheet = page.getByRole('dialog')
      await expect(sheet.getByRole('heading', { name: 'Filtres' })).toBeVisible()

      // Période dans le futur : aucun réel seedé ne peut avoir été publié après aujourd'hui.
      await sheet.locator('#mobile-reels-start-date').fill('2099-01-01')
      await sheet.getByRole('button', { name: 'Voir les résultats' }).click()

      await expect(page.getByRole('heading', { name: 'Aucun réel ne correspond à vos filtres' })).toBeVisible()
      await expect(page.getByText(VILLA_DESCRIPTION)).not.toBeVisible()

      await page.getByRole('button', { name: 'Réinitialiser les filtres' }).click()
      await expect(page.getByText(VILLA_DESCRIPTION)).toBeVisible()
      await expect(page.getByText(STUDIO_DESCRIPTION)).toBeVisible()
    })

    test('la recherche mobile filtre aussi les réels par description', async ({ page }) => {
      await gotoMyReels(page)

      await page.locator('#reels-search-mobile').fill('studio')
      await expect(page.getByText(STUDIO_DESCRIPTION)).toBeVisible()
      await expect(page.getByText(VILLA_DESCRIPTION)).not.toBeVisible()
    })
  })
})
