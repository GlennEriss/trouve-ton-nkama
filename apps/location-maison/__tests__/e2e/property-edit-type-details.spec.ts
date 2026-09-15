import crypto from 'node:crypto'

import { expect, test, type Page } from '@playwright/test'

import { E2E_ANNOUNCER, signInAsAnnouncer } from './helpers/auth'
import { deleteProperties, getProperty, seedProperties, type SeedProperty } from './helpers/firebase-admin'

/**
 * Edition des champs specifiques a chaque type d'annonce immobiliere (nbrRooms, hasParking,
 * kioskType...) sur la page /property/create/preview/[id] — voir DetailsProperty.tsx
 * (EditableField/EditableBooleanField cablees sur `onSaveField`). Un test par typeProperty
 * pour couvrir a la fois le rendu (le bon crayon apparait pour le bon type) et la persistance
 * reelle Firestore (pas seulement le state React local — meme risque que dans
 * property-edit.spec.ts : updateDoc cote client peut echouer silencieusement aux regles de
 * securite sans qu'un test qui ne verifie que le DOM ne le detecte).
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-property-edit-details-owner-${RUN_ID}`

const BASE: Omit<SeedProperty, 'id' | 'title' | 'typeProperty'> = {
  description: 'Annonce de test edition des details par type.',
  status: 'FOR_SALE',
  state: 'IN_PROGRESS',
  moderationStatus: 'APPROVED',
  price: 1000000,
  area: 100,
  province: 'Estuaire',
  city: 'Libreville',
  street: 'Rue de test',
  latitude: 0.4162,
  longitude: 9.4673,
}

type TypeDetailsCase = {
  typeProperty: string
  seedExtra: Partial<SeedProperty>
  /**
   * Libelle affiche a cote du champ (ex. "Chambres", "Parking") utilise pour distinguer LE bon
   * crayon parmi plusieurs sur la meme section. Absent pour Kiosk/Room : un seul champ texte
   * sans wrapper `DetailsItem`/libelle, donc un seul bouton "Modifier" dans toute la section.
   */
  fieldLabel?: string
  /** true pour le toggle Oui/Non (EditableBooleanField), false pour un input texte/nombre. */
  boolean?: boolean
  newValue: string
  firestoreField: string
  expected: string | number | boolean
}

const CASES: TypeDetailsCase[] = [
  {
    typeProperty: 'Apartment',
    seedExtra: { nbrRooms: 2, nbrKitchens: 1, nbrBathrooms: 1, nbrToilets: 1 },
    fieldLabel: 'Chambres',
    newValue: '4',
    firestoreField: 'nbrRooms',
    expected: 4,
  },
  {
    typeProperty: 'Studio',
    seedExtra: { nbrRooms: 1, nbrKitchens: 1, nbrBathrooms: 1, nbrToilets: 1 },
    fieldLabel: 'Salles de bain',
    newValue: '2',
    firestoreField: 'nbrBathrooms',
    expected: 2,
  },
  {
    typeProperty: 'Home',
    seedExtra: {
      nbrRooms: 3, nbrKitchens: 1, nbrBathrooms: 2, nbrToilets: 2,
      nbrLivingRoom: 1, nbrFloors: 1, nbrGarages: 0,
    },
    fieldLabel: 'Garages',
    newValue: '2',
    firestoreField: 'nbrGarages',
    expected: 2,
  },
  {
    typeProperty: 'Villa',
    seedExtra: {
      nbrRooms: 5, nbrKitchens: 2, nbrBathrooms: 3, nbrToilets: 3,
      nbrFloors: 2, nbrPiscine: 0, nbrGarages: 1,
    },
    fieldLabel: 'Piscines',
    newValue: '1',
    firestoreField: 'nbrPiscine',
    expected: 1,
  },
  {
    typeProperty: 'Building',
    seedExtra: { nbrFloors: 3, hasParking: false, nbrApartments: 6 },
    fieldLabel: 'Parking',
    boolean: true,
    newValue: 'Oui',
    firestoreField: 'hasParking',
    expected: true,
  },
  {
    typeProperty: 'Desk',
    seedExtra: { nbrToilets: 1, nbrRooms: 2 },
    fieldLabel: 'Salles',
    newValue: '5',
    firestoreField: 'nbrRooms',
    expected: 5,
  },
  {
    typeProperty: 'Shop',
    seedExtra: { nbrRooms: 1, nbrToilet: 1 },
    fieldLabel: 'Salles',
    newValue: '3',
    firestoreField: 'nbrRooms',
    expected: 3,
  },
  {
    typeProperty: 'Kiosk',
    seedExtra: { kioskType: 'Alimentation' },
    newValue: 'Boissons',
    firestoreField: 'kioskType',
    expected: 'Boissons',
  },
  {
    typeProperty: 'Room',
    seedExtra: { roomType: 'Chambre simple' },
    newValue: 'Chambre double',
    firestoreField: 'roomType',
    expected: 'Chambre double',
  },
  {
    typeProperty: 'Land',
    seedExtra: { area: 300 },
    fieldLabel: 'Superficie',
    newValue: '450',
    firestoreField: 'area',
    expected: 450,
  },
]

function seedFor(testCase: TypeDetailsCase): SeedProperty {
  return {
    ...BASE,
    ...testCase.seedExtra,
    id: `e2e-edit-details-${testCase.typeProperty.toLowerCase()}-${RUN_ID}`,
    title: `${testCase.typeProperty} test edition details E2E`,
    typeProperty: testCase.typeProperty,
  }
}

const SEEDS = CASES.map(seedFor)

async function gotoPreview(page: Page, id: string) {
  await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
  await page.goto(`/property/create/preview/${id}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Application error', exact: false })).not.toBeVisible()
}

test.describe('Edition des details specifiques par typeProperty (page preview annonce)', () => {
  test.beforeAll(async () => {
    await seedProperties(OWNER_UID, SEEDS)
  })

  test.afterAll(async () => {
    await deleteProperties(SEEDS.map((seed) => seed.id))
  })

  for (const testCase of CASES) {
    const label = testCase.fieldLabel ?? `type ${testCase.typeProperty}`
    test(`${testCase.typeProperty} : modifier "${label}" persiste en Firestore`, async ({ page }) => {
      const id = seedFor(testCase).id
      await gotoPreview(page, id)

      // "Aperçu" est le titre de la section qui contient DetailsProperty — la scoper evite de
      // matcher un autre bouton "Modifier" de la page (titre, prix, description...) portant le
      // meme label accessible. Kiosk/Room n'ont qu'un seul champ texte sans libelle
      // `DetailsItem` : un seul bouton "Modifier" dans toute la section, pas besoin de le
      // distinguer par texte voisin.
      // NB: `page.locator('section', { has: ... })` matchait AUSSI la section EXTERIEURE (qui
      // contient la section "Aperçu" en descendant, donc satisfait `has` elle aussi) — on
      // remonte plutot depuis le heading lui-meme, dont le parent direct est la bonne section
      // (h1 et DetailsProperty sont freres dans le JSX).
      const detailsSection = page.getByRole('heading', { name: 'Aperçu' }).locator('..')
      const field = testCase.fieldLabel ? detailsSection.getByText(testCase.fieldLabel).locator('..') : detailsSection
      await field.getByRole('button', { name: 'Modifier' }).click()

      if (testCase.boolean) {
        await field.getByRole('button', { name: testCase.newValue, exact: true }).click()
      } else {
        await field.locator('input').fill(testCase.newValue)
      }
      await field.getByRole('button', { name: 'Enregistrer' }).click()

      // Couvre les deux messages d'echec possibles : celui d'EditableField/EditableBooleanField
      // ("Échec de la mise à jour.") et celui de saveField sur un updateProperty en échec
      // ("La mise à jour a échoué...") — voir PreviewPropertyDraft.tsx.
      await expect(field.getByText(/a échoué|Échec de la mise à jour/)).not.toBeVisible()
      await expect
        .poll(async () => (await getProperty(id))?.[testCase.firestoreField], { timeout: 10000 })
        .toBe(testCase.expected)
    })
  }
})
