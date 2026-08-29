import crypto from 'node:crypto'

import { expect, test, type Page } from '@playwright/test'

import { E2E_ANNOUNCER, signInAsAnnouncer } from './helpers/auth'
import {
  deleteProperties,
  seedCategoryListing,
  seedProperties,
  type SeedProperty,
} from './helpers/firebase-admin'

/**
 * Bouton "Modifier" sur /property. Son lien branche entre les deux flux d'édition, tous deux
 * des pages preview + crayons (plus l'ancien formulaire à 14 builders pour l'immobilier,
 * décision produit explicite) :
 *   !ad.typeProperty && ad.categoryId ? `${add_category_listing}/preview/${id}`
 *                                     : `${properties}/create/preview/${id}`
 * (AdManagementPage.tsx) — `categoryId` seul n'est PAS le bon discriminant. Un backfill
 * en prod (2026-08-17, commentaire de resolveScope() dans /api/announcer/ads/route.ts) a posé
 * `categoryId` sur ~949/950 annonces, **immobilier comprises** (studio, home, apartment...).
 * Partout ailleurs dans ce code (resolveScope, HouseDetails.tsx, PreviewPropertyClient.tsx),
 * le vrai discriminant est `!typeProperty && categoryId` — la présence de `typeProperty`
 * prime. Cette annonce immobilière avec `categoryId` (réaliste, backfill) sert à vérifier que
 * "Modifier" respecte bien ce même discriminant partout, y compris ici.
 */
// RUN_ID doit être unique par processus worker, pas seulement par fichier : avec
// `fullyParallel: true`, Playwright exécute chacun des 3 tests de ce describe dans un
// worker séparé, chacun réimportant ce module et recalculant RUN_ID indépendamment. Un
// `Date.now()` peut produire la même valeur dans deux workers lancés à la même
// milliseconde ; les deux écrivent alors le même id, et l'`afterAll` du premier worker à
// finir supprime le document avant que l'autre worker n'ait fini de tester dessus (observé
// en e2e réel : la villa "disparaissait" avant même que son propre test ne s'exécute).
// OWNER_UID doit lui aussi être unique par worker : sinon, comme il est interrogé par
// egalité stricte (`createdBy == uid`) sans filtre par id, les annonces "Mode"/"Villa" de
// TOUS les workers actifs en même temps apparaissent ensemble sur la même page (constaté :
// "Robe test bouton Modifier E2E" trouvée en double/quadruple).
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-property-edit-owner-${RUN_ID}`

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
  latitude: 0.4162,
  longitude: 9.4673,
  // Donnée réaliste post-backfill : une annonce immobilière a aussi un categoryId.
  categoryId: 'immobilier-villas',
}

const REJECTED_VILLA: SeedProperty = {
  ...VILLA_WITH_CATEGORY_ID,
  id: `e2e-edit-villa-rejected-${RUN_ID}`,
  title: 'Villa rejetée test bouton Modifier E2E',
  moderationStatus: 'REJECTED',
  rejectionReason: 'Photos manquantes',
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
    await seedProperties(OWNER_UID, [VILLA_WITH_CATEGORY_ID, REJECTED_VILLA])
    await seedCategoryListing(OWNER_UID, CATEGORY_LISTING)
  })

  test.afterAll(async () => {
    await deleteProperties([VILLA_WITH_CATEGORY_ID.id, REJECTED_VILLA.id, CATEGORY_LISTING.id])
  })

  test('Modifier une annonce immobilière APPROVED (avec categoryId réaliste) ouvre la page preview + crayons, sans bandeau "vient d\'être créée"', async ({
    page,
  }) => {
    await gotoPropertyAndClickModifier(page, VILLA_WITH_CATEGORY_ID.title)

    await expect(page).toHaveURL(new RegExp(`/property/create/preview/${VILLA_WITH_CATEGORY_ID.id}$`))
    await expect(page.getByRole('heading', { name: 'Application error', exact: false })).not.toBeVisible()
    // Annonce déjà APPROVED : le bandeau ne doit pas prétendre qu'elle "vient d'être créée"
    // et attend une première review — ce serait faux pour une annonce déjà en ligne.
    await expect(page.getByText(/vient d.être créée|Ton annonce est déjà enregistrée/)).not.toBeVisible()
    await expect(page.getByText('Modifie ce que tu veux avec les crayons ci-dessous')).toBeVisible()
    await expect(page.getByRole('heading', { name: VILLA_WITH_CATEGORY_ID.title })).toBeVisible()
  })

  test('Modifier une annonce immobilière REJECTED affiche le motif de rejet', async ({ page }) => {
    await gotoPropertyAndClickModifier(page, REJECTED_VILLA.title)

    await expect(page).toHaveURL(new RegExp(`/property/create/preview/${REJECTED_VILLA.id}$`))
    await expect(page.getByRole('heading', { name: 'Application error', exact: false })).not.toBeVisible()
    await expect(page.getByText('Cette annonce a été rejetée.')).toBeVisible()
    await expect(page.getByText(REJECTED_VILLA.rejectionReason!)).toBeVisible()
  })

  test('Modifier une annonce Mode ouvre le flux d\'édition Mode', async ({ page }) => {
    await gotoPropertyAndClickModifier(page, CATEGORY_LISTING.title, 'marketplace')

    await expect(page).toHaveURL(new RegExp(`/category-listing/create/preview/${CATEGORY_LISTING.id}$`))
    await expect(page.getByRole('heading', { name: 'Application error', exact: false })).not.toBeVisible()
  })
})
