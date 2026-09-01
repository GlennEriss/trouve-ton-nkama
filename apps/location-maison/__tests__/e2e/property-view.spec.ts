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
 * Bouton "Voir" sur /property (Gestion des annonces) — mène à /property/{id}, rendu par
 * PreviewPropertyClient.tsx. Contrairement à la page publique /annonce/{id}
 * (HouseDetails.tsx), qui branche explicitement entre PreviewProperty (immobilier) et
 * PreviewCategoryListing (Mode/marketplace) via `isCategoryListing = !typeProperty &&
 * categoryId`, PreviewPropertyClient.tsx rend TOUJOURS PreviewProperty — construit autour
 * du bien immobilier (statut à louer/vendre, `property.tags.map(...)` sans garde, alors
 * qu'une annonce Mode n'a jamais de `tags`).
 */
// RUN_ID doit être unique par worker Playwright, pas seulement par run manuel : avec
// `fullyParallel: true`, chaque test de ce fichier peut s'exécuter dans un worker séparé, qui
// réimporte ce module et recalcule RUN_ID indépendamment. Un `Date.now()` peut produire la
// même valeur dans deux workers lancés à la même milliseconde ; les deux écriraient alors le
// même id, et l'afterAll du premier worker à finir supprimerait le document avant que l'autre
// worker n'ait fini de tester dessus (constaté en e2e réel sur property-edit.spec.ts, même
// pattern). OWNER_UID doit lui aussi être unique par worker, sinon les annonces de tous les
// workers actifs en même temps s'affichent ensemble sur la même page /property (interrogées
// par égalité stricte sur `createdBy`, sans filtre par id).
// Accessoirement : /api/property/id met la réponse en cache (Redis, 10 min) sous
// property:{id} dès qu'une annonce "publiquement visible" (state IN_PROGRESS +
// moderationStatus APPROVED — le cas de VILLA ici) est lue une fois — un id unique par run
// évite aussi de servir une réponse périmée d'un run précédent.
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-property-view-owner-${RUN_ID}`

const VILLA: SeedProperty = {
  id: `e2e-view-villa-${RUN_ID}`,
  title: 'Villa test bouton Voir E2E',
  description: 'Villa de test pour le bouton Voir.',
  typeProperty: 'Villa',
  status: 'FOR_SALE',
  state: 'IN_PROGRESS',
  moderationStatus: 'APPROVED',
  price: 3000000,
  area: 200,
  province: 'Estuaire',
  city: 'Libreville',
  street: 'Rue de test',
  // Sans coordonnées, SimpleMap.tsx plante ("Invalid LatLng object") au lieu de gérer
  // l'absence — vrai flux de création en fournit toujours (sélection sur carte), donc pas
  // creusé plus loin ici, juste évité pour isoler le bug réellement visé (Mode vs immobilier).
  latitude: 0.4162,
  longitude: 9.4673,
} as SeedProperty

const CATEGORY_LISTING = {
  id: `e2e-view-mode-${RUN_ID}`,
  title: 'Robe test bouton Voir E2E',
  description: 'Robe de soirée, très bon état.',
  price: 15000,
  province: 'Estuaire',
  city: 'Libreville',
  categoryId: 'mode-robes',
  categoryLeaf: 'Robes',
  attributes: { etat: 'Très bon état', taille: 'M' },
}

async function gotoPropertyAndClickVoir(
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
  await card.getByRole('link', { name: 'Voir' }).click()
}

test.describe('Bouton "Voir" /property — immobilier et Mode', () => {
  test.beforeAll(async () => {
    await seedProperties(OWNER_UID, [VILLA])
    await seedCategoryListing(OWNER_UID, CATEGORY_LISTING)
  })

  test.afterAll(async () => {
    await deleteProperties([VILLA.id, CATEGORY_LISTING.id])
  })

  test('Voir une annonce immobilière ouvre la fiche immobilier correcte', async ({ page }) => {
    await gotoPropertyAndClickVoir(page, VILLA.title)

    await expect(page).toHaveURL(new RegExp(`/property/${VILLA.id}$`))
    await expect(page.getByRole('heading', { name: VILLA.title })).toBeVisible()
    await expect(page.getByText('A VENDRE')).toBeVisible()
  })

  test('Voir une annonce Mode ouvre la fiche Mode correcte (pas le gabarit immobilier)', async ({
    page,
  }) => {
    await gotoPropertyAndClickVoir(page, CATEGORY_LISTING.title, 'marketplace')

    await expect(page).toHaveURL(new RegExp(`/property/${CATEGORY_LISTING.id}$`))
    // PreviewCategoryListing : titre + prix + chip catégorie ("Robes"), pas de statut
    // à louer/vendre (n'existe pas hors immobilier).
    await expect(page.getByText(CATEGORY_LISTING.title)).toBeVisible()
    await expect(page.getByText('Robes')).toBeVisible()
    await expect(page.getByText('A LOUER')).not.toBeVisible()
    await expect(page.getByText('A VENDRE')).not.toBeVisible()
  })
})
