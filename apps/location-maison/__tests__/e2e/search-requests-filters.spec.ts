import crypto from 'node:crypto'

import { expect, test } from '@playwright/test'

import { deleteSearchRequests, seedSearchRequest } from './helpers/firebase-admin'

/**
 * Preuve de bout en bout, vraie lecture Firestore (pas mockée), pour l'onglet "Demandes" de
 * /search — demande explicite de l'utilisateur. Pas de session requise : /search et
 * /demandes-recherche sont entièrement publics (SearchRequestsListClient lit directement via
 * le SDK client, sans authentification, voir search-request.db.ts).
 *
 * Ne couvre PAS la création réelle d'une demande (paiement MyPayGa réel, aucun sandbox
 * documenté dans ce dépôt — la question de savoir comment tester ce flux reste à trancher
 * avec l'utilisateur, voir BUGS-PROPERTY-E2E-2026-08.md).
 */
const RUN_ID = crypto.randomUUID()
const SHORT_ID = RUN_ID.slice(0, 8)

const STUDIO_ID = `e2e-sr-studio-${RUN_ID}`
const VILLA_ID = `e2e-sr-villa-${RUN_ID}`
const BOOSTED_ID = `e2e-sr-boosted-${RUN_ID}`

const STUDIO_DESCRIPTION = `Recherche studio meublé proche centre-ville ${SHORT_ID}`
const VILLA_DESCRIPTION = `Recherche villa avec piscine bord de mer ${SHORT_ID}`
const BOOSTED_DESCRIPTION = `Recherche urgente chambre étudiant ${SHORT_ID}`

test.describe('Filtres sur /search?category=Demandes — vraie lecture Firestore', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    await seedSearchRequest({
      id: STUDIO_ID,
      typeProperty: 'Studio',
      transactionType: 'FOR_RENT',
      province: 'Estuaire',
      city: 'Libreville',
      budgetMinXaf: 80000,
      budgetMaxXaf: 150000,
      description: STUDIO_DESCRIPTION,
      whatsappContact: '+24166000001',
    })
    await seedSearchRequest({
      id: VILLA_ID,
      typeProperty: 'Villa',
      transactionType: 'FOR_SALE',
      province: 'Ogooué-Maritime',
      city: 'Port-Gentil',
      budgetMinXaf: 30000000,
      budgetMaxXaf: 50000000,
      description: VILLA_DESCRIPTION,
      whatsappContact: '+24166000002',
    })
    // Type distinct (Room) des deux autres : une demande boostée ignore volontairement les
    // filtres type/transaction/ville (getBoostedSearchRequests n'en tient pas compte, voir
    // search-request.db.ts) — la garder identifiable évite toute ambiguïté dans les assertions
    // "disparaît/reste visible" ci-dessous.
    await seedSearchRequest({
      id: BOOSTED_ID,
      typeProperty: 'Room',
      transactionType: 'FOR_RENT',
      province: 'Estuaire',
      city: 'Libreville',
      budgetMinXaf: 40000,
      budgetMaxXaf: 60000,
      description: BOOSTED_DESCRIPTION,
      whatsappContact: '+24166000003',
      boostEndAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
  })

  test.afterAll(async () => {
    await deleteSearchRequests([STUDIO_ID, VILLA_ID, BOOSTED_ID])
  })

  test('le pill "Demandes" affiche les vraies demandes, la boostée en tête dans "Recherches urgentes"', async ({
    page,
  }) => {
    await page.goto('/search', { waitUntil: 'domcontentloaded' })
    const pills = page.getByRole('tablist', { name: 'Filtrer par catégorie' })
    await expect(pills.getByRole('button', { name: 'Demandes', exact: true })).toBeVisible({ timeout: 15000 })
    await pills.getByRole('button', { name: 'Demandes', exact: true }).click()
    await expect(page).toHaveURL(/category=Demandes/, { timeout: 15000 })

    await expect(page.getByText('Recherches urgentes')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(BOOSTED_DESCRIPTION)).toBeVisible()
    await expect(page.getByText('Toutes les demandes')).toBeVisible()
    await expect(page.getByText(STUDIO_DESCRIPTION)).toBeVisible()
    await expect(page.getByText(VILLA_DESCRIPTION)).toBeVisible()
  })

  test('filtre par type de bien (desktop, select inline)', async ({ page }) => {
    // La section desktop inline est CSS-masquée (hidden sm:flex) sous 640px — pas pertinent sur
    // un projet mobile, l'équivalent y est couvert par le Sheet (tests mobile ci-dessous).
    test.skip((page.viewportSize()?.width ?? 0) < 640, 'Filtres desktop inline masqués sous 640px')
    await page.goto('/search?category=Demandes', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(VILLA_DESCRIPTION)).toBeVisible({ timeout: 15000 })

    await page.locator('#type-property').selectOption({ label: 'Villa' })

    await expect(page.getByText(VILLA_DESCRIPTION)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(STUDIO_DESCRIPTION)).not.toBeVisible()
    // La boostée reste visible : getBoostedSearchRequests() ne filtre jamais par type, ce n'est
    // pas un bug de ce test mais le comportement réel du composant.
    await expect(page.getByText(BOOSTED_DESCRIPTION)).toBeVisible()

    await page.locator('#type-property').selectOption({ label: 'Tous les types de bien' })
    await expect(page.getByText(STUDIO_DESCRIPTION)).toBeVisible({ timeout: 15000 })
  })

  test('filtre par location/vente (desktop, select inline)', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 640, 'Filtres desktop inline masqués sous 640px')
    await page.goto('/search?category=Demandes', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(STUDIO_DESCRIPTION)).toBeVisible({ timeout: 15000 })

    await page.locator('#transaction-type').selectOption({ label: 'Vente' })

    await expect(page.getByText(VILLA_DESCRIPTION)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(STUDIO_DESCRIPTION)).not.toBeVisible()
  })

  test('filtre par ville (desktop, select inline)', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 640, 'Filtres desktop inline masqués sous 640px')
    await page.goto('/search?category=Demandes', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(VILLA_DESCRIPTION)).toBeVisible({ timeout: 15000 })

    await page.locator('#city').selectOption({ label: 'Port-Gentil' })

    await expect(page.getByText(VILLA_DESCRIPTION)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(STUDIO_DESCRIPTION)).not.toBeVisible()
  })

  test('combinaison de filtres (type + ville) sans resultat regulier : la boostee reste affichee', async ({
    page,
  }) => {
    // Une demande boostee reste TOUJOURS visible dans "Recherches urgentes" quel que soit le
    // filtre (getBoostedSearchRequests ne filtre jamais par type/transaction/ville, par
    // conception) — "Toutes les demandes" disparaît, mais pas "Recherches urgentes". Sur
    // desktop les filtres restent de toute façon accessibles (section inline non conditionnelle,
    // voir le test mobile ci-dessous pour la variante qui a réellement un bouton à perdre).
    test.skip((page.viewportSize()?.width ?? 0) < 640, 'Filtres desktop inline masqués sous 640px')
    await page.goto('/search?category=Demandes', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(VILLA_DESCRIPTION)).toBeVisible({ timeout: 15000 })

    await page.locator('#type-property').selectOption({ label: 'Villa' })
    await page.locator('#city').selectOption({ label: 'Libreville' })

    await expect(page.getByText('Toutes les demandes')).not.toBeVisible({ timeout: 15000 })
    await expect(page.getByText(STUDIO_DESCRIPTION)).not.toBeVisible()
    await expect(page.getByText(VILLA_DESCRIPTION)).not.toBeVisible()
    // La boostee reste correctement affichee (comportement reel, pas un residu du bug).
    await expect(page.getByText('Recherches urgentes')).toBeVisible()
    await expect(page.getByText(BOOSTED_DESCRIPTION)).toBeVisible()
    // Les filtres eux-mêmes restent accessibles (section desktop inline, jamais masquée).
    await expect(page.locator('#type-property')).toBeVisible()
  })

  test('mobile : combinaison sans resultat regulier (mais une boostee reste) ne fait pas disparaître le bouton Filtres', async ({
    page,
  }) => {
    // Bug réel trouvé et corrigé en écrivant ce test : le bouton Filtres mobile n'était rendu
    // qu'à côté de "Toutes les demandes" ou dans le message "Aucune demande" (qui exigeait AUSSI
    // boosted vide) — les deux disparaissaient ensemble dès qu'une boostée restait affichée
    // malgré un filtre sans résultat régulier, laissant le bouton introuvable sans recharger.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/search?category=Demandes', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(VILLA_DESCRIPTION)).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'Filtres', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await dialog.locator('#mobile-type-property').selectOption({ label: 'Villa' })
    await dialog.locator('#mobile-city').selectOption({ label: 'Libreville' })
    await dialog.getByRole('button', { name: 'Voir les résultats' }).click()
    await expect(dialog).not.toBeVisible()

    await expect(page.getByText('Toutes les demandes')).not.toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Recherches urgentes')).toBeVisible()
    await expect(page.getByText(BOOSTED_DESCRIPTION)).toBeVisible()
    // Le vrai point de ce test.
    await expect(page.getByRole('button', { name: 'Filtres', exact: true })).toBeVisible()
  })

  test('mobile : le Sheet de filtres applique un filtre reel puis le retire via Reinitialiser', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/search?category=Demandes', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(VILLA_DESCRIPTION)).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'Filtres', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    await dialog.locator('#mobile-type-property').selectOption({ label: 'Villa' })
    await dialog.getByRole('button', { name: 'Voir les résultats' }).click()
    await expect(dialog).not.toBeVisible()

    await expect(page.getByText(VILLA_DESCRIPTION)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(STUDIO_DESCRIPTION)).not.toBeVisible()

    await page.getByRole('button', { name: 'Filtres', exact: true }).click()
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await dialog.getByRole('button', { name: 'Réinitialiser' }).click()
    // Réinitialiser ne ferme pas le Sheet (vérifié aussi en Jest) — fermer explicitement pour
    // revoir les résultats complets.
    await dialog.getByRole('button', { name: 'Voir les résultats' }).click()

    await expect(page.getByText(STUDIO_DESCRIPTION)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(VILLA_DESCRIPTION)).toBeVisible()
  })
})
