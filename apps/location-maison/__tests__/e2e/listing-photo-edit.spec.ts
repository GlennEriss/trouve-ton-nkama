import crypto from 'node:crypto'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import {
  deleteProperties,
  deletePropertyImagesByOwner,
  getProperty,
  seedCategoryListing,
  seedProperties,
} from './helpers/firebase-admin'

const OWNER_UID = `e2e-photo-edit-${crypto.randomUUID()}`
const FIXTURE_IMAGE = {
  filePATH: 'e2e-fixtures/photo-initiale.png',
  fileURL: '/apple-touch-icon.png',
}

async function exercisePhotoEdition(page: Page, id: string, previewPath: string) {
  await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
  await mockCommonAppNoise(page, { mockFirebaseToken: false })
  await page.goto(`${previewPath}/${id}`, { waitUntil: 'domcontentloaded' })

  await expect(page.getByText('1/10 photos')).toBeVisible()
  await page.getByLabel('Choisir des photos à ajouter').setInputFiles(
    path.join(process.cwd(), 'public', 'apple-touch-icon.png'),
  )
  await expect.poll(async () => {
    return ((await getProperty(id))?.images as unknown[] | undefined)?.length ?? 0
  }, { timeout: 40_000 }).toBe(2)

  await page.getByRole('button', { name: 'Supprimer la photo 2' }).click()
  await expect(page.getByRole('dialog')).toContainText('Supprimer cette photo ?')
  await page.getByRole('button', { name: 'Supprimer la photo', exact: true }).click()
  await expect.poll(async () => {
    return ((await getProperty(id))?.images as unknown[] | undefined)?.length ?? 0
  }, { timeout: 15_000 }).toBe(1)
}

test.describe('Modification réelle des photos — cycle de vie maîtrisé', () => {
  test.describe.configure({ mode: 'serial' })

  test('Immobilier : crée une annonce, ajoute/supprime une photo, puis nettoie tout', async ({ page }) => {
    test.setTimeout(90_000)
    const id = `e2e-photo-property-${crypto.randomUUID()}`
    try {
      await seedProperties(OWNER_UID, [{
        id,
        title: 'Annonce immobilière E2E modification photos',
        description: 'Fixture temporaire supprimée à la fin du test.',
        typeProperty: 'Studio', status: 'FOR_RENT', state: 'IN_PROGRESS', moderationStatus: 'APPROVED',
        price: 120000, area: 30, province: 'Estuaire', city: 'Libreville', street: 'Glass',
        latitude: 0.4162, longitude: 9.4673, images: [FIXTURE_IMAGE],
      }])
      await exercisePhotoEdition(page, id, '/property/create/preview')
    } finally {
      await deleteProperties([id])
      await deletePropertyImagesByOwner(OWNER_UID)
    }
    expect(await getProperty(id)).toBeNull()
  })

  test('Mode : crée une annonce, ajoute/supprime une photo, puis nettoie tout', async ({ page }) => {
    test.setTimeout(90_000)
    const id = `e2e-photo-mode-${crypto.randomUUID()}`
    try {
      await seedCategoryListing(OWNER_UID, {
        id,
        title: 'Annonce Mode E2E modification photos',
        description: 'Fixture temporaire supprimée à la fin du test.',
        price: 15000, province: 'Estuaire', city: 'Libreville', categoryId: 'mode-robes',
        categoryLeaf: 'Mode > Robes', attributes: { etat: 'Très bon état' }, images: [FIXTURE_IMAGE],
      })
      await exercisePhotoEdition(page, id, '/category-listing/create/preview')
    } finally {
      await deleteProperties([id])
      await deletePropertyImagesByOwner(OWNER_UID)
    }
    expect(await getProperty(id)).toBeNull()
  })
})
