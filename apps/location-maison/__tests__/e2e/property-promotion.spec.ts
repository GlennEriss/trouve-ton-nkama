import crypto from 'node:crypto'

import { expect, test, type Locator, type Page } from '@playwright/test'

import { E2E_ANNOUNCER, signInAsAnnouncer } from './helpers/auth'
import {
  deleteProperties,
  deleteUserDoc,
  seedAnnouncerUser,
  seedProperties,
  type SeedProperty,
} from './helpers/firebase-admin'

/**
 * /property — promotion d'une annonce (PromotionModal), avec un vrai utilisateur et de
 * vraies annonces Firestore. /api/property/promote débite les crédits et met à jour
 * currentPromotion dans une vraie transaction Firestore — ces tests exercent ce vrai
 * chemin, crédits compris, pas un mock.
 *
 * Contrairement à property-edit/archive/view/filters-search.spec.ts, une simple isolation
 * par worker (id unique par test) ne suffit PAS ici : les tests dépendent volontairement les
 * uns des autres dans le même run (voir "une promotion déjà active..." et le solde exact de
 * crédits "167" dans le test Boost, qui suppose que Featured/Trending7/Trending3/Boost ont
 * déjà débité dans cet ordre sur la MÊME annonce/le MÊME compte). Avec `fullyParallel: true`,
 * Playwright peut répartir ces tests sur des workers séparés, cassant cet ordre et cette
 * donnée partagée — `mode: 'serial'` force leur exécution en séquence, dans un seul worker,
 * comme le code des tests le suppose déjà implicitement.
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-promotion-owner-${RUN_ID}`
const LOW_CREDIT_UID = `e2e-promotion-low-credit-${RUN_ID}`

function makeProperty(id: string, title: string): SeedProperty {
  return {
    id,
    title,
    description: 'Annonce de test pour la promotion.',
    typeProperty: 'Apartment',
    status: 'FOR_RENT',
    state: 'IN_PROGRESS',
    moderationStatus: 'APPROVED',
    price: 200000,
    area: 60,
    province: 'Estuaire',
    city: 'Libreville',
    street: 'Rue de test',
  }
}

const FEATURED_PROPERTY = makeProperty(`e2e-promo-featured-${RUN_ID}`, 'Annonce test promotion Featured')
const TRENDING7_PROPERTY = makeProperty(`e2e-promo-trending7-${RUN_ID}`, 'Annonce test promotion Trending7')
const TRENDING3_PROPERTY = makeProperty(`e2e-promo-trending3-${RUN_ID}`, 'Annonce test promotion Trending3')
const BOOST_PROPERTY = makeProperty(`e2e-promo-boost-${RUN_ID}`, 'Annonce test promotion Boost')
const LOW_CREDIT_PROPERTY = makeProperty(`e2e-promo-lowcredit-${RUN_ID}`, 'Annonce test promotion LowCredit')

const ALL_PROPERTIES = [
  FEATURED_PROPERTY,
  TRENDING7_PROPERTY,
  TRENDING3_PROPERTY,
  BOOST_PROPERTY,
  LOW_CREDIT_PROPERTY,
]

async function gotoPropertyAs(page: Page, uid: string, credits = 200) {
  // Le solde affiché/utilisé pour hasEnoughCredits vient de la session (useCurrentUser),
  // pas d'une relecture Firestore côté client : doit matcher le seed Firestore réel
  // (seedAnnouncerUser) pour que le test crédits-insuffisants ait un sens.
  await signInAsAnnouncer(page.context(), 'http://localhost:3000', {
    ...E2E_ANNOUNCER,
    uid,
    credits,
  })
  await page.goto('/property', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Gestion des annonces' })).toBeVisible()
}

function cardFor(page: Page, title: string): Locator {
  return page
    .locator('h3', { hasText: title })
    .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
}

test.describe('Promotion d\'une annonce /property — vrai Firestore, tous les types', () => {
  // Obligatoire : voir le commentaire sur RUN_ID plus haut — ces tests dépendent d'un ordre
  // d'exécution précis et d'un état serveur partagé (solde de crédits, promotion déjà active).
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 200)
    await seedAnnouncerUser(LOW_CREDIT_UID, 2)
    await seedProperties(OWNER_UID, [FEATURED_PROPERTY, TRENDING7_PROPERTY, TRENDING3_PROPERTY, BOOST_PROPERTY])
    await seedProperties(LOW_CREDIT_UID, [LOW_CREDIT_PROPERTY])
  })

  test.afterAll(async () => {
    await deleteProperties(ALL_PROPERTIES.map((item) => item.id))
    await deleteUserDoc(OWNER_UID)
    await deleteUserDoc(LOW_CREDIT_UID)
  })

  test('Mise à la une (featured, 15 crédits, 7 jours)', async ({ page }) => {
    await gotoPropertyAs(page, OWNER_UID)
    const card = cardFor(page, FEATURED_PROPERTY.title)
    await card.getByRole('button', { name: 'Promouvoir' }).click()

    await expect(page.getByRole('heading', { name: 'Promouvoir votre annonce' })).toBeVisible()

    await page.getByRole('button', { name: /Sélectionner Mise à la une/ }).click()
    await page.getByRole('button', { name: 'Promouvoir maintenant' }).click()

    await expect(page.getByText('Promotion activée !', { exact: true })).toBeVisible({ timeout: 15000 })
    // Le modal se ferme sur succès (onSuccess: onClose dans usePromotion).
    await expect(page.getByRole('heading', { name: 'Promouvoir votre annonce' })).not.toBeVisible()

    // Preuve que l'invalidation de cache (announcer-ad-management) fonctionne vraiment :
    // la carte affiche le nouveau libellé SANS recharger la page.
    await expect(card.getByRole('button', { name: 'À la une' })).toBeVisible({ timeout: 10000 })
  })

  test('Mise en tendance 7 jours (10 crédits)', async ({ page }) => {
    await gotoPropertyAs(page, OWNER_UID)
    const card = cardFor(page, TRENDING7_PROPERTY.title)
    await card.getByRole('button', { name: 'Promouvoir' }).click()

    await page.getByRole('button', { name: /Sélectionner Mise en tendance -/ }).click()
    await page.getByRole('button', { name: 'Promouvoir maintenant' }).click()

    await expect(page.getByText('Promotion activée !', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(card.getByRole('button', { name: 'En tendance' })).toBeVisible({ timeout: 10000 })

    // Réouvrir la modale : le statut distingue bien 7j vs 3j (le badge carte, lui, ne le fait pas).
    await card.getByRole('button', { name: 'En tendance' }).click()
    await expect(page.getByText(/en tendance \(7j\)/)).toBeVisible()
  })

  test('Mise en tendance courte (3 jours, 5 crédits)', async ({ page }) => {
    await gotoPropertyAs(page, OWNER_UID)
    const card = cardFor(page, TRENDING3_PROPERTY.title)
    await card.getByRole('button', { name: 'Promouvoir' }).click()

    await page.getByRole('button', { name: /Sélectionner Mise en tendance courte/ }).click()
    await page.getByRole('button', { name: 'Promouvoir maintenant' }).click()

    await expect(page.getByText('Promotion activée !', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(card.getByRole('button', { name: 'En tendance' })).toBeVisible({ timeout: 10000 })

    await card.getByRole('button', { name: 'En tendance' }).click()
    await expect(page.getByText(/en tendance \(3j\)/)).toBeVisible()
  })

  test('Boost (remontée immédiate, 3 crédits, sans durée)', async ({ page }) => {
    await gotoPropertyAs(page, OWNER_UID)
    const card = cardFor(page, BOOST_PROPERTY.title)
    await card.getByRole('button', { name: 'Promouvoir' }).click()

    await page.getByRole('button', { name: /Sélectionner Remonter une annonce/ }).click()
    await page.getByRole('button', { name: 'Promouvoir maintenant' }).click()

    await expect(page.getByText('Promotion activée !', { exact: true })).toBeVisible({ timeout: 15000 })
    // Le boost a duration=0 (endDate === startDate) : par design, hasActivePromotion() ne
    // peut jamais être vrai pour ce type (voir PROMOTION_CONFIGS) — il ne laisse donc pas de
    // badge/bouton "Boostée" persistant, contrairement aux 3 autres types. Seule preuve
    // observable côté UI : les crédits ont bien été débités.
    await card.getByRole('button', { name: 'Promouvoir' }).click()
    // 200 (seed) - 15 (featured) - 10 (trending-7d) - 5 (trending-3d) - 3 (boost) = 167.
    await expect(page.getByText('167', { exact: true })).toBeVisible()
  })

  test('une promotion déjà active ne peut pas être resélectionnée', async ({ page }) => {
    // Dépend du test "Mise à la une" ci-dessus (même run, même OWNER_UID) : la carte
    // Featured a déjà une promotion 'featured' active à ce stade.
    await gotoPropertyAs(page, OWNER_UID)
    const card = cardFor(page, FEATURED_PROPERTY.title)
    await card.getByRole('button', { name: 'À la une' }).click()

    await expect(page.getByText('Promotion active')).toBeVisible()
    const featuredOption = page.getByRole('button', { name: /Sélectionner Mise à la une/ })
    await expect(featuredOption).toBeDisabled()
    await expect(featuredOption.getByText('Active')).toBeVisible()
  })

  test('crédits insuffisants : les options trop chères sont désactivées', async ({ page }) => {
    await gotoPropertyAs(page, LOW_CREDIT_UID, 2)
    const card = cardFor(page, LOW_CREDIT_PROPERTY.title)
    await card.getByRole('button', { name: 'Promouvoir' }).click()

    // 2 crédits dispo : aucune des 4 options (3 à 15 crédits) n'est accessible.
    const boostOption = page.getByRole('button', { name: /Sélectionner Remonter une annonce/ })
    await expect(boostOption).toBeDisabled()
    await expect(boostOption.getByText('Crédits insuffisants')).toBeVisible()

    const featuredOption = page.getByRole('button', { name: /Sélectionner Mise à la une/ })
    await expect(featuredOption).toBeDisabled()

    await expect(page.getByRole('button', { name: 'Promouvoir maintenant' })).toBeDisabled()
  })
})
