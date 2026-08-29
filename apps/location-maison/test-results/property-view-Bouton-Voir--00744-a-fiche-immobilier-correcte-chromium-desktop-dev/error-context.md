# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: property-view.spec.ts >> Bouton "Voir" /property — immobilier et Mode >> Voir une annonce immobilière ouvre la fiche immobilier correcte
- Location: __tests__/e2e/property-view.spec.ts:87:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Villa test bouton Voir E2E')
Expected: visible
Error: strict mode violation: getByText('Villa test bouton Voir E2E') resolved to 2 elements:
    1) <h3 class="line-clamp-2 min-h-[3rem] text-lg font-semibold text-gray-900 dark:text-white">Villa test bouton Voir E2E</h3> aka getByRole('heading', { name: 'Villa test bouton Voir E2E' }).first()
    2) <h3 class="line-clamp-2 min-h-[3rem] text-lg font-semibold text-gray-900 dark:text-white">Villa test bouton Voir E2E</h3> aka getByRole('heading', { name: 'Villa test bouton Voir E2E' }).nth(1)

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Villa test bouton Voir E2E')

```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test'
  2   | 
  3   | import { E2E_ANNOUNCER, signInAsAnnouncer } from './helpers/auth'
  4   | import {
  5   |   deleteProperties,
  6   |   seedCategoryListing,
  7   |   seedProperties,
  8   |   type SeedProperty,
  9   | } from './helpers/firebase-admin'
  10  | 
  11  | /**
  12  |  * Bouton "Voir" sur /property (Gestion des annonces) — mène à /property/{id}, rendu par
  13  |  * PreviewPropertyClient.tsx. Contrairement à la page publique /annonce/{id}
  14  |  * (HouseDetails.tsx), qui branche explicitement entre PreviewProperty (immobilier) et
  15  |  * PreviewCategoryListing (Mode/marketplace) via `isCategoryListing = !typeProperty &&
  16  |  * categoryId`, PreviewPropertyClient.tsx rend TOUJOURS PreviewProperty — construit autour
  17  |  * du bien immobilier (statut à louer/vendre, `property.tags.map(...)` sans garde, alors
  18  |  * qu'une annonce Mode n'a jamais de `tags`).
  19  |  */
  20  | const OWNER_UID = 'e2e-property-view-owner'
  21  | // /api/property/id met la réponse en cache (Redis, 10 min) sous property:{id} dès qu'une
  22  | // annonce "publiquement visible" (state IN_PROGRESS + moderationStatus APPROVED — le cas de
  23  | // VILLA ici) est lue une fois. Réutiliser un id fixe entre plusieurs runs de ce fichier sert
  24  | // une réponse périmée si les données du seed ont changé entre-temps — id unique par run.
  25  | const RUN_ID = Date.now()
  26  | 
  27  | const VILLA: SeedProperty = {
  28  |   id: `e2e-view-villa-${RUN_ID}`,
  29  |   title: 'Villa test bouton Voir E2E',
  30  |   description: 'Villa de test pour le bouton Voir.',
  31  |   typeProperty: 'Villa',
  32  |   status: 'FOR_SALE',
  33  |   state: 'IN_PROGRESS',
  34  |   moderationStatus: 'APPROVED',
  35  |   price: 3000000,
  36  |   area: 200,
  37  |   province: 'Estuaire',
  38  |   city: 'Libreville',
  39  |   street: 'Rue de test',
  40  |   // Sans coordonnées, SimpleMap.tsx plante ("Invalid LatLng object") au lieu de gérer
  41  |   // l'absence — vrai flux de création en fournit toujours (sélection sur carte), donc pas
  42  |   // creusé plus loin ici, juste évité pour isoler le bug réellement visé (Mode vs immobilier).
  43  |   latitude: 0.4162,
  44  |   longitude: 9.4673,
  45  | } as SeedProperty
  46  | 
  47  | const CATEGORY_LISTING = {
  48  |   id: `e2e-view-mode-${RUN_ID}`,
  49  |   title: 'Robe test bouton Voir E2E',
  50  |   description: 'Robe de soirée, très bon état.',
  51  |   price: 15000,
  52  |   province: 'Estuaire',
  53  |   city: 'Libreville',
  54  |   categoryId: 'mode-robes',
  55  |   categoryLeaf: 'Robes',
  56  |   attributes: { etat: 'Très bon état', taille: 'M' },
  57  | }
  58  | 
  59  | async function gotoPropertyAndClickVoir(
  60  |   page: Page,
  61  |   title: string,
  62  |   scope: 'immobilier' | 'marketplace' = 'immobilier',
  63  | ) {
  64  |   await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
  65  |   await page.goto('/property', { waitUntil: 'domcontentloaded' })
  66  |   await expect(page.getByRole('heading', { name: 'Gestion des annonces' })).toBeVisible()
  67  | 
  68  |   if (scope === 'marketplace') {
  69  |     await page.getByRole('tab', { name: /Mode/ }).click()
  70  |   }
> 71  |   await expect(page.getByText(title)).toBeVisible()
      |                                       ^ Error: expect(locator).toBeVisible() failed
  72  | 
  73  |   const card = page.locator('h3', { hasText: title }).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
  74  |   await card.getByRole('link', { name: 'Voir' }).click()
  75  | }
  76  | 
  77  | test.describe('Bouton "Voir" /property — immobilier et Mode', () => {
  78  |   test.beforeAll(async () => {
  79  |     await seedProperties(OWNER_UID, [VILLA])
  80  |     await seedCategoryListing(OWNER_UID, CATEGORY_LISTING)
  81  |   })
  82  | 
  83  |   test.afterAll(async () => {
  84  |     await deleteProperties([VILLA.id, CATEGORY_LISTING.id])
  85  |   })
  86  | 
  87  |   test('Voir une annonce immobilière ouvre la fiche immobilier correcte', async ({ page }) => {
  88  |     await gotoPropertyAndClickVoir(page, VILLA.title)
  89  | 
  90  |     await expect(page).toHaveURL(new RegExp(`/property/${VILLA.id}$`))
  91  |     await expect(page.getByRole('heading', { name: VILLA.title })).toBeVisible()
  92  |     await expect(page.getByText('A VENDRE')).toBeVisible()
  93  |   })
  94  | 
  95  |   test('Voir une annonce Mode ouvre la fiche Mode correcte (pas le gabarit immobilier)', async ({
  96  |     page,
  97  |   }) => {
  98  |     await gotoPropertyAndClickVoir(page, CATEGORY_LISTING.title, 'marketplace')
  99  | 
  100 |     await expect(page).toHaveURL(new RegExp(`/property/${CATEGORY_LISTING.id}$`))
  101 |     // PreviewCategoryListing : titre + prix + chip catégorie ("Robes"), pas de statut
  102 |     // à louer/vendre (n'existe pas hors immobilier).
  103 |     await expect(page.getByText(CATEGORY_LISTING.title)).toBeVisible()
  104 |     await expect(page.getByText('Robes')).toBeVisible()
  105 |     await expect(page.getByText('A LOUER')).not.toBeVisible()
  106 |     await expect(page.getByText('A VENDRE')).not.toBeVisible()
  107 |   })
  108 | })
  109 | 
```