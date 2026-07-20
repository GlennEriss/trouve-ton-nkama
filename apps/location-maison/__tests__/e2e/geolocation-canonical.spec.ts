import { expect, test, type Page } from '@playwright/test'

import { mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { expectNoHorizontalOverflow } from './helpers/layout'
import { expectLastActionAboveBottomNavigation } from './helpers/ux-audit'

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 960 },
] as const

const catalog = {
  provinces: [
    { name: 'Estuaire', lat: 0.4162, lon: 9.4673, type: 'province', osmId: 1, osmType: 'relation', source: 'admin_boundaries' },
  ],
  cities: [
    { name: 'Libreville', lat: 0.4162, lon: 9.4673, type: 'city', osmId: 2, osmType: 'node', source: 'places' },
  ],
  quarters: [
    {
      name: 'Atong Abe',
      aliases: ['Toabet', 'Toabe'],
      lat: 0.4117628,
      lon: 9.4511796,
      type: 'quarter',
      osmId: 1827771028,
      osmType: 'node',
      source: 'places',
    },
  ],
  cityToProvince: { Libreville: 'Estuaire' },
  quarterToCity: { 'Atong Abe': 'Libreville' },
  quarterToProvince: { 'Atong Abe': 'Estuaire' },
}

async function setup(page: Page) {
  await signInAsAnnouncer(page.context())
  await mockCommonAppNoise(page)
  await page.route('**/api/tags', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, tags: ['Calme'] }) }),
  )
  await page.route('**/api/location/osm/gabon', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: catalog, source: { mode: 'local' } }),
    }),
  )
  await page.route('**/api/places/autocomplete', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) }),
  )
  await page.route('**/api/analytics/search', (route) =>
    route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ success: true }) }),
  )
  await page.addInitScript(() => {
    localStorage.setItem('property_form_draft_studio', JSON.stringify({
      images: ['/apple-touch-icon.png'],
      title: 'Studio test localisation',
      description: 'Description suffisamment longue pour tester la localisation canonique.',
      area: 30,
      price: 75000,
      status: 'FOR_RENT',
      isOwner: true,
      tags: ['Calme'],
    }))
  })
}

for (const viewport of VIEWPORTS) {
  test(`sélection canonique Toabet sur ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await setup(page)
    await page.goto('/property/add/studio', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: /^Suivant$/i }).click()
    await expect(page.getByLabel('Numéro du studio')).toBeVisible()
    await page.getByRole('button', { name: /^Suivant$/i }).click()
    await expect(page.getByText('Localisation du bien').first()).toBeVisible({ timeout: 10_000 })

    await page.getByLabel('Province').click()
    await page.getByRole('option', { name: 'Estuaire' }).click()

    const city = page.getByLabel('Ville')
    await city.fill('Libre')
    await page.getByRole('option', { name: /Libreville/i }).click()
    await expect(city).toHaveValue('Libreville')

    const district = page.getByLabel('Quartier')
    await district.fill('Toabet')
    const canonicalOption = page.getByRole('option', { name: /Atong-Abè/i })
    await expect(canonicalOption).toContainText('Lieu vérifié Trouve Ton Nkama')
    await canonicalOption.click()

    await expect(district).toHaveValue('Atong-Abè')
    await expect(page.getByText('Sélectionnez un lieu proposé pour valider ce champ.')).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
    if (viewport.name === 'mobile') await expectLastActionAboveBottomNavigation(page)
  })
}
