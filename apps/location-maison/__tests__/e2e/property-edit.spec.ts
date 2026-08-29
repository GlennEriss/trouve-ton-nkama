import { expect, test, type Page } from '@playwright/test'

import { E2E_ANNOUNCER, signInAsAnnouncer } from './helpers/auth'
import {
  deleteProperties,
  seedCategoryListing,
  seedProperties,
  type SeedProperty,
} from './helpers/firebase-admin'

/**
 * Bouton "Modifier" sur /property. Son lien branche déjà entre les deux flux d'édition :
 *   ad.categoryId ? `${add_category_listing}/preview/${id}` : `${properties}/modify/${id}`
 * (AdManagementPage.tsx) — mais `categoryId` seul n'est PAS le bon discriminant. Un backfill
 * en prod (2026-08-17, commentaire de resolveScope() dans /api/announcer/ads/route.ts) a posé
 * `categoryId` sur ~949/950 annonces, **immobilier comprises** (studio, home, apartment...).
 * Partout ailleurs dans ce code (resolveScope, HouseDetails.tsx, PreviewPropertyClient.tsx),
 * le vrai discriminant est `!typeProperty && categoryId` — la présence de `typeProperty`
 * prime. Cette annonce immobilière avec `categoryId` (réaliste, backfill) sert à vérifier que
 * "Modifier" respecte bien ce même discriminant partout, y compris ici.
 */
const OWNER_UID = 'e2e-property-edit-owner'
const RUN_ID = Date.now()

const VILLA_WITH_CATEGORY_ID: SeedProperty = {
  id: `e2e-edit-villa-${RUN_ID}`,
  title: 'Villa test bouton Modifier E2E',
  description: 'Villa de test pour le bouton Modifier.',
  typeProperty: 'Villa',
  status: 'FOR_SALE',
  state: 'IN_PROGRESS',
  moderationStatus: 'APPROVED',
  price: 3000000,
  area: 200,
  province: 'Estuaire',
  city: 'Libreville',
  street: 'Rue de test',
  // Donnée réaliste post-backfill : une annonce immobilière a aussi un categoryId.
  categoryId: 'immobilier-villas',
}

const CATEGORY_LISTING = {
  id: `e2e-edit-mode-${RUN_ID}`,
  title: 'Robe test bouton Modifier E2E',
  description: 'Robe de soirée, très bon état.',
  price: 15000,
  province: 'Estuaire',
  city: 'Libreville',
  categoryId: 'mode-robes',
  categoryLeaf: 'Robes',
  attributes: { etat: 'Très bon état' },
}

async function gotoPropertyAndClickModifier(
  page: Page,
  title: string,
  scope: 'immobilier' | 'marketplace' = 'immobilier',
) {
  await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
  await page.goto('/property', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Gestion des annonces' })).toBeVisible()

  if (scope === 'marketplace') {
    await page.getByRole('tab', { name: /Mode/ }).click()
  }
  await expect(page.getByText(title)).toBeVisible()

  const card = page.locator('h3', { hasText: title }).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
  await card.getByRole('link', { name: 'Modifier' }).click()
}

test.describe('Bouton "Modifier" /property — immobilier (avec categoryId) et Mode', () => {
  test.beforeAll(async () => {
    await seedProperties(OWNER_UID, [VILLA_WITH_CATEGORY_ID])
    await seedCategoryListing(OWNER_UID, CATEGORY_LISTING)
  })

  test.afterAll(async () => {
    await deleteProperties([VILLA_WITH_CATEGORY_ID.id, CATEGORY_LISTING.id])
  })

  test('Modifier une annonce immobilière (avec categoryId réaliste) ouvre le vrai formulaire immobilier', async ({
    page,
  }) => {
    await gotoPropertyAndClickModifier(page, VILLA_WITH_CATEGORY_ID.title)

    await expect(page).toHaveURL(new RegExp(`/property/modify/${VILLA_WITH_CATEGORY_ID.id}$`))
    await expect(page.getByRole('heading', { name: 'Application error', exact: false })).not.toBeVisible()
    // FormModifyProperty affiche un spinner tant que getPropertyById()/getFactoryClass()
    // n'ont pas résolu — sa disparition confirme que le vrai formulaire (pas juste la bonne
    // URL) a fini par se monter.
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 })
  })

  test('Modifier une annonce Mode ouvre le flux d\'édition Mode', async ({ page }) => {
    await gotoPropertyAndClickModifier(page, CATEGORY_LISTING.title, 'marketplace')

    await expect(page).toHaveURL(new RegExp(`/category-listing/create/preview/${CATEGORY_LISTING.id}$`))
    await expect(page.getByRole('heading', { name: 'Application error', exact: false })).not.toBeVisible()
  })
})
