import crypto from 'node:crypto'

import { expect, test, type Page } from '@playwright/test'

import { E2E_ANNOUNCER, signInAsAnnouncer } from './helpers/auth'
import { deleteProperties, seedProperties, type SeedProperty } from './helpers/firebase-admin'

/**
 * /property (Gestion des annonces) — recherche et filtres, avec de vraies
 * annonces Firestore (pas de mock réseau). /api/announcer/ads interroge
 * Firestore par `createdBy` puis filtre/trie en mémoire côté serveur — ces
 * tests exercent donc ce vrai code de filtrage, pas juste l'UI.
 *
 * RUN_ID/OWNER_UID uniques par worker (crypto.randomUUID(), pas de littéral statique) : avec
 * `fullyParallel: true`, Playwright peut répartir les tests Desktop/Mobile de ce fichier sur
 * des workers séparés, chacun réimportant ce module. Des ids statiques partagés entre workers
 * font que l'afterAll du premier worker à finir supprime les annonces avant qu'un autre worker
 * n'ait fini de tester dessus (même bug déjà trouvé et corrigé sur property-edit.spec.ts /
 * property-archive.spec.ts — voir BUGS-PROPERTY-E2E-2026-08.md). Ces tests sont en lecture
 * seule (recherche/filtre, aucun état serveur muté d'un test à l'autre), donc contrairement à
 * property-promotion.spec.ts, une isolation par worker suffit : pas besoin de mode `serial`.
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-property-filters-owner-${RUN_ID}`

const VILLA: SeedProperty = {
  id: `e2e-prop-villa-${RUN_ID}`,
  title: 'Villa test Libreville E2E',
  description: 'Grande villa avec jardin.',
  typeProperty: 'Villa',
  status: 'FOR_SALE',
  state: 'IN_PROGRESS',
  moderationStatus: 'APPROVED',
  price: 5000000,
  area: 300,
  province: 'Estuaire',
  city: 'Libreville',
  street: 'Bord de mer',
}

const STUDIO: SeedProperty = {
  id: `e2e-prop-studio-${RUN_ID}`,
  title: 'Studio test Akanda E2E',
  description: 'Studio meublé proche commodités.',
  typeProperty: 'Studio',
  status: 'FOR_RENT',
  state: 'IN_PROGRESS',
  moderationStatus: 'APPROVED',
  price: 150000,
  area: 25,
  province: 'Estuaire',
  city: 'Akanda',
  street: 'Rue des cocotiers',
}

const ARCHIVED_APARTMENT: SeedProperty = {
  id: `e2e-prop-archived-${RUN_ID}`,
  title: 'Appartement test Owendo E2E',
  description: 'Appartement archivé.',
  typeProperty: 'Apartment',
  status: 'FOR_RENT',
  state: 'ARCHIVED',
  moderationStatus: 'APPROVED',
  price: 200000,
  area: 60,
  province: 'Estuaire',
  city: 'Owendo',
  street: 'Rue du port',
}

const SEED = [VILLA, STUDIO, ARCHIVED_APARTMENT]

async function gotoProperty(page: Page) {
  await signInAsAnnouncer(page.context(), 'http://localhost:3000', {
    ...E2E_ANNOUNCER,
    uid: OWNER_UID,
  })
  await page.goto('/property', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Gestion des annonces' })).toBeVisible()
  // Laisse le premier appel réel à /api/announcer/ads (données seed) se terminer.
  await expect(page.getByText(VILLA.title)).toBeVisible({ timeout: 15000 })
}

test.describe('Recherche et filtres /property — vraies annonces Firestore', () => {
  test.beforeAll(async () => {
    await seedProperties(OWNER_UID, SEED)
  })

  test.afterAll(async () => {
    await deleteProperties(SEED.map((item) => item.id))
  })

  test.describe('Desktop', () => {
    test.use({ viewport: { width: 1440, height: 960 } })

    test('la recherche filtre par titre/ville en temps réel', async ({ page }) => {
      await gotoProperty(page)
      await expect(page.getByText(STUDIO.title)).toBeVisible()
      await expect(page.getByText(ARCHIVED_APARTMENT.title)).toBeVisible()

      await page.locator('#property-search').fill('Akanda')

      await expect(page.getByText(STUDIO.title)).toBeVisible()
      await expect(page.getByText(VILLA.title)).not.toBeVisible()
      await expect(page.getByText(ARCHIVED_APARTMENT.title)).not.toBeVisible()
    })

    test('la recherche par titre fonctionne, insensible à la casse', async ({ page }) => {
      await gotoProperty(page)

      await page.locator('#property-search').fill('VILLA TEST')

      await expect(page.getByText(VILLA.title)).toBeVisible()
      await expect(page.getByText(STUDIO.title)).not.toBeVisible()
      await expect(page.getByText(ARCHIVED_APARTMENT.title)).not.toBeVisible()
    })

    test('une recherche sans résultat affiche l état vide', async ({ page }) => {
      await gotoProperty(page)

      await page.locator('#property-search').fill('zzz-introuvable-zzz')

      await expect(page.getByRole('heading', { name: 'Aucune annonce trouvée' })).toBeVisible()
      await expect(page.getByText(VILLA.title)).not.toBeVisible()
      await expect(page.getByText(STUDIO.title)).not.toBeVisible()
      await expect(page.getByText(ARCHIVED_APARTMENT.title)).not.toBeVisible()
    })

    test('le bouton "Effacer la recherche" vide le champ et restaure les résultats', async ({
      page,
    }) => {
      await gotoProperty(page)

      await page.locator('#property-search').fill('Akanda')
      await expect(page.getByText(VILLA.title)).not.toBeVisible()

      await page.getByRole('button', { name: 'Effacer la recherche' }).click()

      await expect(page.locator('#property-search')).toHaveValue('')
      await expect(page.getByText(VILLA.title)).toBeVisible()
      await expect(page.getByText(STUDIO.title)).toBeVisible()
      await expect(page.getByText(ARCHIVED_APARTMENT.title)).toBeVisible()
    })

    test('le filtre Type ne garde que le type sélectionné', async ({ page }) => {
      await gotoProperty(page)

      await page.locator('#property-type-filter').click()
      await page.getByRole('option', { name: 'Villas' }).click()

      await expect(page.getByText(VILLA.title)).toBeVisible()
      await expect(page.getByText(STUDIO.title)).not.toBeVisible()
      await expect(page.getByText(ARCHIVED_APARTMENT.title)).not.toBeVisible()
    })

    test('le filtre État isole les annonces archivées', async ({ page }) => {
      await gotoProperty(page)

      await page.locator('#property-state-filter').click()
      await page.getByRole('option', { name: 'Archivées', exact: true }).click()

      await expect(page.getByText(ARCHIVED_APARTMENT.title)).toBeVisible()
      await expect(page.getByText(VILLA.title)).not.toBeVisible()
      await expect(page.getByText(STUDIO.title)).not.toBeVisible()
    })

    test('le filtre prix minimum exclut les annonces moins chères', async ({ page }) => {
      await gotoProperty(page)

      await page.locator('#property-price-min').fill('1000000')

      await expect(page.getByText(VILLA.title)).toBeVisible()
      await expect(page.getByText(STUDIO.title)).not.toBeVisible()
      await expect(page.getByText(ARCHIVED_APARTMENT.title)).not.toBeVisible()
    })

    test('Réinitialiser efface la recherche et les filtres', async ({ page }) => {
      await gotoProperty(page)

      await page.locator('#property-search').fill('Akanda')
      await expect(page.getByText(VILLA.title)).not.toBeVisible()

      await page.getByRole('button', { name: 'Réinitialiser' }).click()

      await expect(page.locator('#property-search')).toHaveValue('')
      await expect(page.getByText(VILLA.title)).toBeVisible()
      await expect(page.getByText(STUDIO.title)).toBeVisible()
      await expect(page.getByText(ARCHIVED_APARTMENT.title)).toBeVisible()
    })
  })

  test.describe('Mobile', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('la recherche filtre par titre/ville en temps réel', async ({ page }) => {
      await gotoProperty(page)
      await expect(page.getByText(STUDIO.title)).toBeVisible()

      await page.locator('#property-search-mobile').fill('Akanda')

      await expect(page.getByText(STUDIO.title)).toBeVisible()
      await expect(page.getByText(VILLA.title)).not.toBeVisible()
    })

    test('le bouton "Effacer la recherche" vide le champ et restaure les résultats', async ({
      page,
    }) => {
      await gotoProperty(page)

      await page.locator('#property-search-mobile').fill('Akanda')
      await expect(page.getByText(VILLA.title)).not.toBeVisible()

      await page.getByRole('button', { name: 'Effacer la recherche' }).click()

      await expect(page.locator('#property-search-mobile')).toHaveValue('')
      await expect(page.getByText(VILLA.title)).toBeVisible()
      await expect(page.getByText(STUDIO.title)).toBeVisible()
    })

    test('le Sheet de filtres applique le filtre Type puis Réinitialiser le retire', async ({
      page,
    }) => {
      await gotoProperty(page)

      await page.getByRole('button', { name: 'Filtres' }).click()
      await expect(page.getByRole('heading', { name: 'Filtres' })).toBeVisible()

      await page.locator('#mobile-property-type-filter').click()
      await page.getByRole('option', { name: 'Studios' }).click()
      await page.getByRole('button', { name: 'Voir les résultats' }).click()

      await expect(page.getByText(STUDIO.title)).toBeVisible()
      await expect(page.getByText(VILLA.title)).not.toBeVisible()

      await page.getByRole('button', { name: 'Filtres' }).click()
      await page.getByRole('button', { name: 'Réinitialiser' }).click()
      await page.getByRole('button', { name: 'Voir les résultats' }).click()

      await expect(page.getByText(VILLA.title)).toBeVisible()
      await expect(page.getByText(STUDIO.title)).toBeVisible()
    })
  })
})
