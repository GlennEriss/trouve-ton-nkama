import crypto from 'node:crypto'

import { expect, test, type Locator, type Page } from '@playwright/test'

import { E2E_ANNOUNCER, signInAsAnnouncer } from './helpers/auth'
import {
  deleteProperties,
  getProperty,
  seedCategoryListing,
  seedProperties,
  type SeedProperty,
} from './helpers/firebase-admin'

/**
 * Bouton "Archiver"/"Réactiver" sur /property (AdManagementPage.tsx -> toggleAdState ->
 * updateProperty -> PATCH /api/property/[id], corrigé le même jour que ce test — voir
 * BUGS-PROPERTY-E2E-2026-08.md, "les sauvegardes par crayon ne persistaient jamais
 * réellement"). Vérifie la vraie persistance Firestore (pas seulement le badge/toast côté UI)
 * pour l'immobilier ET Mode, dans les deux sens (archiver puis désarchiver).
 *
 * RUN_ID/OWNER_UID uniques par worker (crypto.randomUUID(), pas Date.now()) : même raison que
 * property-edit.spec.ts — fullyParallel fait tourner chaque test dans un worker séparé, un
 * RUN_ID collisionnable ferait qu'un afterAll supprime les données d'un autre worker en cours
 * de test.
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-property-archive-owner-${RUN_ID}`

const ACTIVE_VILLA: SeedProperty = {
  id: `e2e-archive-villa-${RUN_ID}`,
  title: 'Villa test archivage E2E',
  description: 'Villa de test pour l’archivage.',
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
}

const ARCHIVED_VILLA: SeedProperty = {
  ...ACTIVE_VILLA,
  id: `e2e-unarchive-villa-${RUN_ID}`,
  title: 'Villa test désarchivage E2E',
  state: 'ARCHIVED',
}

const ACTIVE_MODE_LISTING = {
  id: `e2e-archive-mode-${RUN_ID}`,
  title: 'Robe test archivage E2E',
  description: 'Robe de soirée, très bon état.',
  price: 15000,
  province: 'Estuaire',
  city: 'Libreville',
  categoryId: 'mode-robes',
  categoryLeaf: 'Robes',
  attributes: { etat: 'Très bon état' },
}

const ARCHIVED_MODE_LISTING = {
  ...ACTIVE_MODE_LISTING,
  id: `e2e-unarchive-mode-${RUN_ID}`,
  title: 'Robe test désarchivage E2E',
  state: 'ARCHIVED' as const,
}

async function gotoAdCard(page: Page, title: string, scope: 'immobilier' | 'marketplace' = 'immobilier') {
  await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
  await page.goto('/property', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Gestion des annonces' })).toBeVisible()

  if (scope === 'marketplace') {
    await page.getByRole('tab', { name: /Mode/ }).click()
  }
  await expect(page.getByText(title)).toBeVisible()

  return page.locator('h3', { hasText: title }).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
}

/**
 * Le bouton "Archiver"/"Réactiver" de la carte n'agit pas directement : il ouvre une Dialog de
 * confirmation (AdManagementPage.tsx, requestToggleState/confirmToggleState) qu'il faut valider
 * avec le même libellé.
 */
async function toggleAndConfirm(page: Page, label: 'Archiver' | 'Réactiver', card: Locator) {
  await card.getByRole('button', { name: label }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: label, exact: true }).click()
}

test.describe('Bouton "Archiver"/"Réactiver" /property — immobilier et Mode', () => {
  test.beforeAll(async () => {
    await seedProperties(OWNER_UID, [ACTIVE_VILLA, ARCHIVED_VILLA])
    await seedCategoryListing(OWNER_UID, ACTIVE_MODE_LISTING)
    await seedCategoryListing(OWNER_UID, ARCHIVED_MODE_LISTING)
  })

  test.afterAll(async () => {
    await deleteProperties([
      ACTIVE_VILLA.id,
      ARCHIVED_VILLA.id,
      ACTIVE_MODE_LISTING.id,
      ARCHIVED_MODE_LISTING.id,
    ])
  })

  test('Archiver une annonce immobilière active la passe en Archivée, en base', async ({ page }) => {
    const card = await gotoAdCard(page, ACTIVE_VILLA.title)
    await expect(card.getByText('Active', { exact: true })).toBeVisible()

    await toggleAndConfirm(page, 'Archiver', card)
    await expect(page.getByText('L’annonce a été archivée.', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(card.getByText('Archivée', { exact: true })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Réactiver' })).toBeVisible()

    await expect.poll(async () => (await getProperty(ACTIVE_VILLA.id))?.state, { timeout: 5000 }).toBe('ARCHIVED')
  })

  test('Archiver une annonce Mode la passe en Archivée, en base', async ({ page }) => {
    const card = await gotoAdCard(page, ACTIVE_MODE_LISTING.title, 'marketplace')
    await expect(card.getByText('Active', { exact: true })).toBeVisible()

    await toggleAndConfirm(page, 'Archiver', card)
    await expect(page.getByText('L’annonce a été archivée.', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(card.getByText('Archivée', { exact: true })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Réactiver' })).toBeVisible()

    await expect
      .poll(async () => (await getProperty(ACTIVE_MODE_LISTING.id))?.state, { timeout: 5000 })
      .toBe('ARCHIVED')
  })

  test('Désarchiver une annonce immobilière archivée la repasse en Active, en base', async ({ page }) => {
    const card = await gotoAdCard(page, ARCHIVED_VILLA.title)
    await expect(card.getByText('Archivée', { exact: true })).toBeVisible()

    await toggleAndConfirm(page, 'Réactiver', card)
    await expect(page.getByText('L’annonce a été réactivée.', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(card.getByText('Active', { exact: true })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Archiver' })).toBeVisible()

    await expect
      .poll(async () => (await getProperty(ARCHIVED_VILLA.id))?.state, { timeout: 5000 })
      .toBe('IN_PROGRESS')
  })

  test('Désarchiver une annonce Mode archivée la repasse en Active, en base', async ({ page }) => {
    const card = await gotoAdCard(page, ARCHIVED_MODE_LISTING.title, 'marketplace')
    await expect(card.getByText('Archivée', { exact: true })).toBeVisible()

    await toggleAndConfirm(page, 'Réactiver', card)
    await expect(page.getByText('L’annonce a été réactivée.', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(card.getByText('Active', { exact: true })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Archiver' })).toBeVisible()

    await expect
      .poll(async () => (await getProperty(ARCHIVED_MODE_LISTING.id))?.state, { timeout: 5000 })
      .toBe('IN_PROGRESS')
  })
})
