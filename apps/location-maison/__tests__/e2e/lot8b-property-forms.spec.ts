import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

import { mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { expectNoHorizontalOverflow } from './helpers/layout'
import {
  expectLastActionAboveBottomNavigation,
  expectNoSmallTouchTargets,
} from './helpers/ux-audit'

type PropertyScenario = {
  route: string
  heading: RegExp
  step2Labels: string[]
  defaultField?: { label: string; value: string }
  parking?: boolean
  skipsStep2?: boolean
}

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 960 },
] as const

const HOUSING_LABELS = [
  'Nombre de chambres',
  'Nombre de Cuisines',
  'Nombre de douches',
  'Nombre de toilettes',
]

const PROPERTY_SCENARIOS: PropertyScenario[] = [
  {
    route: 'apartment',
    heading: /Ajout d'un appartement/i,
    step2Labels: [...HOUSING_LABELS, "Numero d'étage", "Numéro de l'appartement"],
    defaultField: { label: "Numéro de l'appartement", value: '01' },
  },
  {
    route: 'building',
    heading: /Ajout d'un immeuble/i,
    step2Labels: ["Nombre d'appartements", "Nombre d'étages", 'Parking'],
    parking: true,
  },
  {
    route: 'desk',
    heading: /Ajout d'un bureau/i,
    step2Labels: ['Nombre de toilettes', 'Nombre de salles'],
  },
  {
    route: 'duplex',
    heading: /Ajout d'un duplex/i,
    step2Labels: [...HOUSING_LABELS, "Nombre d'étages", 'Nombre de salons', 'Nombre de garages'],
  },
  {
    route: 'home',
    heading: /Ajout d'une maison/i,
    step2Labels: [...HOUSING_LABELS, "Nombre d'étages", 'Nombre de salons', 'Nombre de garages'],
  },
  {
    route: 'kiosk',
    heading: /Ajout d'un kiosque/i,
    step2Labels: ['Type de kiosque'],
  },
  {
    route: 'land',
    heading: /Ajout d'un terrain/i,
    step2Labels: [],
    skipsStep2: true,
  },
  {
    route: 'room',
    heading: /Ajout d'une chambre/i,
    step2Labels: ['Type de chambre'],
  },
  {
    route: 'shop',
    heading: /Ajout d'un magasin/i,
    step2Labels: ['Nombre de pièces', 'Nombre de toilettes'],
  },
  {
    route: 'studio',
    heading: /Ajout d'un studio/i,
    step2Labels: [...HOUSING_LABELS, "Numero d'étage", 'Numéro du studio'],
    defaultField: { label: 'Numéro du studio', value: '01' },
  },
  {
    route: 'villa',
    heading: /Ajout d'une villa/i,
    step2Labels: [...HOUSING_LABELS, "Nombre d'étages", 'Nombre de garages', 'Nombre de piscine'],
  },
  {
    route: 'warehouse',
    heading: /Ajout d'un entrepôt/i,
    step2Labels: ['Nombre de sections', 'Nombre de toilettes'],
  },
]

function draftFor(route: string) {
  return {
    images: ['/apple-touch-icon.png'],
    title: `Annonce navigateur ${route}`,
    description: `Description complète utilisée pour tester le formulaire ${route}.`,
    area: 80,
    price: 150000,
    status: 'FOR_RENT',
    isOwner: true,
    tags: ['Calme'],
  }
}

async function setupForm(page: Page, scenario: PropertyScenario) {
  await signInAsAnnouncer(page.context())
  await mockCommonAppNoise(page)
  await page.route('**/api/tags', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, tags: ['Calme', 'Parking', 'Sécurisé'] }),
    })
  })
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, {
    key: `property_form_draft_${scenario.route}`,
    value: draftFor(scenario.route),
  })
}

function fieldInput(page: Page, label: string) {
  return page.getByLabel(label, { exact: true })
}

for (const viewport of VIEWPORTS) {
  test.describe(`Lot 8B formulaires annonces ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const scenario of PROPERTY_SCENARIOS) {
      test(`${scenario.route} expose son parcours et ses champs`, async ({ page }) => {
        await setupForm(page, scenario)
        await page.goto(`/property/add/${scenario.route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        })

        await expect(page.getByRole('heading', { name: scenario.heading }).first()).toBeVisible({ timeout: 15_000 })
        await expect(page.getByLabel("Titre de l'annonce")).toHaveValue(`Annonce navigateur ${scenario.route}`)
        await expect(page.getByText('1/10 images')).toBeVisible()

        const area = page.getByLabel('Superficie du bien en mètres carrés')
        const price = page.getByLabel('Prix du bien en FCFA')
        await expect(area).toHaveAttribute('type', 'number')
        await expect(area).toHaveAttribute('inputmode', 'decimal')
        await expect(price).toHaveAttribute('type', 'number')
        await expect(price).toHaveAttribute('inputmode', 'decimal')

        await expectNoHorizontalOverflow(page)
        if (viewport.name === 'mobile') {
          await expectNoSmallTouchTargets(page)
          await expectLastActionAboveBottomNavigation(page)
        }

        await page.getByRole('button', { name: /^Suivant$/i }).click()

        if (scenario.skipsStep2) {
          await expect(page.getByText('Localisation du bien').first()).toBeVisible()
          await expect(page.getByRole('button', { name: /^Enregistrer$/i })).toBeVisible()
        } else {
          for (const label of scenario.step2Labels) {
            await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
          }

          if (scenario.defaultField) {
            await expect(fieldInput(page, scenario.defaultField.label)).toHaveValue(scenario.defaultField.value)
          }

          if (scenario.parking) {
            const noParking = page.getByRole('radio', { name: /^Non$/i })
            await noParking.click()
            await expect(noParking).toBeChecked()
            await expect(page.getByRole('radio', { name: /^Oui$/i })).not.toBeChecked()
          }
        }

        await expectNoHorizontalOverflow(page)
        await page.getByRole('button', { name: /^Précédent$/i }).click()
        await expect(page.getByLabel("Titre de l'annonce")).toHaveValue(`Annonce navigateur ${scenario.route}`)
      })
    }
  })
}

test.describe('Lot 8B comportements transversaux du formulaire', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await signInAsAnnouncer(page.context())
    await mockCommonAppNoise(page)
    await page.route('**/api/tags', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, tags: ['Calme', 'Parking', 'Sécurisé'] }),
      })
    })
  })

  test('affiche les erreurs sans quitter la première étape', async ({ page }) => {
    await page.goto('/property/add/studio', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: /^Suivant$/i }).click()

    await expect(page.getByText('Au moins une image est requise')).toBeVisible()
    await expect(page.getByText('Le titre est obligatoire')).toBeVisible()
    await expect(page.getByText(/description doit contenir au moins 10 caractères/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Précédent$/i })).toHaveCount(0)
  })

  test('ajoute une image puis réinitialise champs, image et brouillon', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('property_form_draft_studio', JSON.stringify({
        title: 'Brouillon à supprimer',
        description: 'Description assez longue pour le brouillon à supprimer.',
        area: 25,
        price: 40000,
        status: 'FOR_RENT',
        isOwner: true,
        tags: ['Calme'],
      }))
    })
    await page.goto('/property/add/studio', { waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel("Titre de l'annonce")).toHaveValue('Brouillon à supprimer')

    await page.getByLabel('Ajouter des images du bien').setInputFiles(
      path.join(process.cwd(), 'public', 'apple-touch-icon.png'),
    )
    await expect(page.getByText('1/10 images')).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: /^Réinitialiser$/i }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /^Réinitialiser$/i }).click()

    await expect(dialog).toHaveCount(0)
    await expect(page.getByLabel("Titre de l'annonce")).toHaveValue('')
    await expect(page.getByText('0/10 images')).toBeVisible()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('property_form_draft_studio'))).toBeNull()
  })

  test('conserve les données entre les étapes et normalise le téléphone gabonais', async ({ page }) => {
    await page.addInitScript((draft) => {
      window.localStorage.setItem('property_form_draft_studio', JSON.stringify(draft))
    }, draftFor('studio'))
    await page.goto('/property/add/studio', { waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel("Titre de l'annonce")).toHaveValue('Annonce navigateur studio')
    await expect(page.getByText('1/10 images')).toBeVisible()

    await page.getByRole('button', { name: /^Suivant$/i }).click()
    await expect(fieldInput(page, 'Numéro du studio')).toHaveValue('01')
    await page.getByRole('button', { name: /^Suivant$/i }).click()

    await expect(page.getByText('Localisation du bien').first()).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Indicatif téléphonique' })).toContainText('+241')
    const phone = page.getByLabel('Numéro de téléphone national')
    await expect(phone).toHaveAttribute('type', 'tel')
    await expect(phone).toHaveAttribute('inputmode', 'numeric')
    await phone.fill('066545430')
    await expect(phone).toHaveValue('66545430')

    await page.getByRole('button', { name: /^Précédent$/i }).click()
    await expect(fieldInput(page, 'Numéro du studio')).toHaveValue('01')
    await page.getByRole('button', { name: /^Précédent$/i }).click()
    await expect(page.getByLabel("Titre de l'annonce")).toHaveValue('Annonce navigateur studio')
  })
})
