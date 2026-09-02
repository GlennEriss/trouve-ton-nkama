import crypto from 'node:crypto'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import {
  deleteProperties,
  deleteReels,
  getReel,
  seedAnnouncerUser,
  seedCategoryListing,
  seedProperties,
  seedReel,
  type SeedProperty,
} from './helpers/firebase-admin'

/**
 * Rattacher un réel orphelin (créé sans annonce, voir CreateOrphanReelClient.tsx) à une annonce
 * a posteriori — bouton "Attacher à une annonce" sur /reels/mine (MyReelsClient.tsx, affiché
 * uniquement quand !reel.propertyId), qui mène à /reels/select-property?attachReelId={id}
 * (SelectPropertyForReelClient.tsx) → PATCH /api/reels action 'attach-property'
 * (attachReelToProperty, reel.db.ts). Aucun test e2e réel n'existait encore pour ce chemin.
 *
 * Vraie session Firebase requise (comme les autres specs de ce dossier) : l'appel PATCH
 * s'authentifie par Bearer ID token Firebase (adminAuth.verifyIdToken), pas seulement le cookie
 * NextAuth forgé.
 *
 * RUN_ID unique par worker (crypto.randomUUID()) : même raison que les autres specs de ce
 * dossier — fullyParallel peut répartir les tests sur des workers séparés.
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-reel-attach-${RUN_ID}`
const REEL_ID = `e2e-reel-attach-reel-${RUN_ID}`
const MODE_REEL_ID = `e2e-reel-attach-mode-reel-${RUN_ID}`
const PROPERTY_ID = `e2e-reel-attach-property-${RUN_ID}`
const MODE_LISTING_ID = `e2e-reel-attach-mode-${RUN_ID}`
const REEL_DESCRIPTION = `Réel orphelin à rattacher, run ${RUN_ID}.`
const MODE_REEL_DESCRIPTION = `Réel Mode à rattacher, run ${RUN_ID}.`
const MODE_LISTING_TITLE = `Robe wax test rattachement de réel ${RUN_ID}`

const PROPERTY: SeedProperty = {
  id: PROPERTY_ID,
  title: `Villa test rattachement de réel ${RUN_ID}`,
  description: 'Villa de test pour le parcours de rattachement de réel.',
  typeProperty: 'Villa',
  status: 'FOR_SALE',
  state: 'IN_PROGRESS',
  moderationStatus: 'APPROVED',
  price: 3_000_000,
  area: 200,
  province: 'Estuaire',
  city: 'Libreville',
  street: 'Rue de test',
  latitude: 0.4162,
  longitude: 9.4673,
}

test.describe('Attacher un réel orphelin à une annonce depuis /reels/mine — vrai Firestore', () => {
  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 0)
    await seedProperties(OWNER_UID, [PROPERTY])
    // Un réel peut être rattaché aussi bien à une annonce immobilier qu'à une annonce Mode
    // (attachReelToProperty ne fait aucune distinction) — ce listing Mode prouve que le
    // sélecteur ne les exclut pas (scope=all côté searchOwnedProperties/property.db.ts).
    await seedCategoryListing(OWNER_UID, {
      id: MODE_LISTING_ID,
      title: MODE_LISTING_TITLE,
      description: 'Robe en wax, très bon état, pour le parcours de rattachement de réel.',
      price: 15_000,
      province: 'Estuaire',
      city: 'Libreville',
      categoryId: 'vetements',
      categoryLeaf: 'Mode > Vêtements',
    })
    // propertyId reste null par défaut (voir seedReel) : c'est justement l'état "orphelin" que
    // ce test doit pouvoir rattacher. Deux réels distincts : les tests s'exécutent sans mode
    // serial dans ce bloc, un seul réel partagé entre deux tests qui l'attachent chacun à une
    // annonce différente serait racy.
    await seedReel(OWNER_UID, { id: REEL_ID, description: REEL_DESCRIPTION })
    await seedReel(OWNER_UID, { id: MODE_REEL_ID, description: MODE_REEL_DESCRIPTION })
  })

  test.afterAll(async () => {
    await deleteReels([
      { id: REEL_ID, uid: OWNER_UID },
      { id: MODE_REEL_ID, uid: OWNER_UID },
    ])
    await deleteProperties([PROPERTY_ID, MODE_LISTING_ID])
  })

  test('le sélecteur d\'annonce propose aussi bien l\'immobilier que le Mode, avec un badge par annonce', async ({
    page,
  }) => {
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto(`/reels/select-property?attachReelId=${REEL_ID}`, { waitUntil: 'domcontentloaded' })

    // Régression corrigée : ce sélecteur excluait auparavant toutes les annonces Mode
    // (scope=immobilier codé en dur), un réel ne pouvait alors être rattaché qu'à de
    // l'immobilier alors que rien côté API ne l'exige.
    await expect(page.getByText(PROPERTY.title)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(MODE_LISTING_TITLE)).toBeVisible({ timeout: 15000 })

    // Demande directe de l'utilisateur : rien n'indiquait la catégorie qu'un réel hériterait en
    // se rattachant à une annonce donnée — chaque carte affiche désormais un badge dédié.
    const immobilierCard = page
      .getByText(PROPERTY.title)
      .locator('xpath=ancestor::div[contains(@class,"cursor-pointer")][1]')
    await expect(immobilierCard.getByText('Immobilier', { exact: true })).toBeVisible()

    const modeCard = page
      .getByText(MODE_LISTING_TITLE)
      .locator('xpath=ancestor::div[contains(@class,"cursor-pointer")][1]')
    await expect(modeCard.getByText('Mode', { exact: true })).toBeVisible()
  })

  test('clique "Attacher à une annonce", choisit l\'annonce, et le rattachement est réellement écrit en base', async ({
    page,
  }) => {
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/reels/mine', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText(REEL_DESCRIPTION)).toBeVisible({ timeout: 20000 })
    const card = page
      .getByText(REEL_DESCRIPTION)
      .locator('xpath=ancestor::div[contains(@class,"flex h-full flex-col")][1]')
    await expect(card.getByText('Pas encore attaché à une annonce')).toBeVisible()

    await card.getByRole('link', { name: 'Attacher à une annonce' }).click()

    await expect(page).toHaveURL(new RegExp(`/reels/select-property\\?attachReelId=${REEL_ID}$`))
    await expect(page.getByRole('heading', { name: "Choisir l'annonce à attacher" })).toBeVisible()
    await expect(page.getByText(PROPERTY.title)).toBeVisible({ timeout: 15000 })

    const propertyCard = page
      .getByText(PROPERTY.title)
      .locator('xpath=ancestor::div[contains(@class,"cursor-pointer")][1]')
    await propertyCard.click()

    await expect(page.getByText('Réel rattaché', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/\/reels\/mine$/, { timeout: 15000 })

    // Preuve définitive côté données, pas juste l'apparence du toast : le champ propertyId a
    // réellement été écrit sur le document reels/{id}.
    await expect.poll(async () => (await getReel(REEL_ID))?.propertyId, { timeout: 15000 }).toBe(PROPERTY_ID)

    // Et le reflet dans l'UI après le retour sur /reels/mine, pas seulement en base : la carte
    // affiche désormais "Attaché" et le bouton de rattachement a disparu (il n'a plus de sens,
    // un réel ne peut être rattaché qu'une fois — voir REEL_ALREADY_ATTACHED côté API).
    await expect(page.getByText(REEL_DESCRIPTION)).toBeVisible({ timeout: 15000 })
    const cardAfter = page
      .getByText(REEL_DESCRIPTION)
      .locator('xpath=ancestor::div[contains(@class,"flex h-full flex-col")][1]')
    await expect(cardAfter.getByText('Attaché à une annonce', { exact: true })).toBeVisible()
    await expect(cardAfter.getByRole('link', { name: 'Attacher à une annonce' })).toHaveCount(0)
  })

  /**
   * Demande directe de l'utilisateur : la catégorie d'un réel (Immobilier/Mode) n'est jamais
   * choisie dans le formulaire — elle est copiée depuis l'annonce au moment du rattachement
   * (categoryPath, voir attach-property dans /api/reels/route.ts).
   *
   * Preuve côté données plutôt qu'en lisant le vrai fil public affiché : `/api/reels/feed` met
   * en cache sa réponse par catégorie 10 minutes (`reels:feed:Mode:{limit}:first`, Redis) SANS
   * segmenter par run de test — un run précédent ayant déjà consulté l'onglet "Mode" dans les 10
   * dernières minutes y laisse une réponse figée qui ne contient jamais le réel tout juste
   * rattaché par CE run, indépendamment de l'exactitude réelle des données. Constaté en e2e réel
   * en enchaînant deux runs à quelques secondes d'intervalle (mobile après desktop) : le second
   * a vu la carte du run précédent, pas la sienne. Vérifier `categoryPath.lvl0` directement sur
   * le document est la preuve déterministe : c'est exactement le champ que `getPublicReels()`
   * filtre pour cet onglet (`where('categoryPath.lvl0', '==', categoryRootName)`, reel.db.ts) —
   * une fois ce champ confirmé correct, le classement dans le fil est garanti par ce filtre,
   * caching mis à part.
   */
  test('rattacher à une annonce Mode copie bien le categoryPath qui classe le réel dans le fil public', async ({
    page,
  }) => {
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto(`/reels/select-property?attachReelId=${MODE_REEL_ID}`, { waitUntil: 'domcontentloaded' })

    await expect(page.getByText(MODE_LISTING_TITLE)).toBeVisible({ timeout: 15000 })
    const modeCard = page
      .getByText(MODE_LISTING_TITLE)
      .locator('xpath=ancestor::div[contains(@class,"cursor-pointer")][1]')
    await modeCard.click()

    await expect(page.getByText('Réel rattaché', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/\/reels\/mine$/, { timeout: 15000 })

    await expect.poll(async () => (await getReel(MODE_REEL_ID))?.propertyId, { timeout: 15000 })
      .toBe(MODE_LISTING_ID)
    const attachedReel = await getReel(MODE_REEL_ID)
    expect((attachedReel?.categoryPath as { lvl0?: string } | undefined)?.lvl0).toBe('Mode')
  })
})

/**
 * Demande directe de l'utilisateur : avec 300 annonces, cette page ne doit pas toutes les
 * charger d'un coup (pagination) et doit permettre de retrouver facilement une annonce
 * particulière (recherche). Vérifie les deux avec de vraies données Firestore, via la vraie
 * route serveur /api/announcer/ads (searchOwnedProperties, property.db.ts) — pas de mock.
 */
test.describe('Recherche et pagination sur /reels/select-property — vrai Firestore', () => {
  const SEARCH_RUN_ID = crypto.randomUUID()
  const SEARCH_OWNER_UID = `e2e-reel-attach-search-${SEARCH_RUN_ID}`
  const SEARCH_REEL_ID = `e2e-reel-attach-search-reel-${SEARCH_RUN_ID}`
  const PAGE_SIZE = 20
  const TOTAL_PROPERTIES = PAGE_SIZE + 1
  // Partagé par toutes les annonces "page" (fillers) pour pouvoir les compter par un seul
  // texte — la findable a un titre totalement différent pour ne jamais matcher par accident.
  const FILLER_TITLE_PREFIX = `Annonce pagination ${SEARCH_RUN_ID}`
  const FINDABLE_TITLE = `Studio rare et unique ${SEARCH_RUN_ID}`

  const FILLER_IDS = Array.from({ length: TOTAL_PROPERTIES - 1 }, (_, i) => `${SEARCH_RUN_ID}-filler-${i}`)
  const FINDABLE_ID = `${SEARCH_RUN_ID}-findable`

  function makeProperty(id: string, title: string): SeedProperty {
    return {
      id,
      title,
      description: 'Annonce de test pour la pagination/recherche du rattachement de réel.',
      typeProperty: 'Studio',
      status: 'FOR_RENT',
      state: 'IN_PROGRESS',
      moderationStatus: 'APPROVED',
      price: 150_000,
      area: 25,
      province: 'Estuaire',
      city: 'Libreville',
      street: 'Rue de test',
      latitude: 0.4162,
      longitude: 9.4673,
    }
  }

  test.beforeAll(async () => {
    await seedAnnouncerUser(SEARCH_OWNER_UID, 0)
    await seedProperties(SEARCH_OWNER_UID, [
      ...FILLER_IDS.map((id, i) => makeProperty(id, `${FILLER_TITLE_PREFIX} #${i}`)),
      makeProperty(FINDABLE_ID, FINDABLE_TITLE),
    ])
    await seedReel(SEARCH_OWNER_UID, { id: SEARCH_REEL_ID, description: 'Réel pour test recherche/pagination.' })
  })

  test.afterAll(async () => {
    await deleteReels([{ id: SEARCH_REEL_ID, uid: SEARCH_OWNER_UID }])
    await deleteProperties([...FILLER_IDS, FINDABLE_ID])
  })

  test('pagine : ne charge pas les 21 annonces d\'un coup, "Voir plus" en charge le reste', async ({ page }) => {
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: SEARCH_OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto(`/reels/select-property?attachReelId=${SEARCH_REEL_ID}`, { waitUntil: 'domcontentloaded' })

    const cards = page.getByTestId('select-property-card')
    await expect(cards).toHaveCount(PAGE_SIZE, { timeout: 20000 })

    const loadMore = page.getByRole('button', { name: /Voir plus d.annonces/i })
    await expect(loadMore).toBeVisible()

    await loadMore.click()

    await expect(cards).toHaveCount(TOTAL_PROPERTIES, { timeout: 15000 })
    await expect(loadMore).toHaveCount(0)
  })

  test('recherche : retrouve une annonce précise sans dépendre de la pagination', async ({ page }) => {
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: SEARCH_OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto(`/reels/select-property?attachReelId=${SEARCH_REEL_ID}`, { waitUntil: 'domcontentloaded' })

    await expect(page.getByTestId('select-property-card')).toHaveCount(PAGE_SIZE, { timeout: 20000 })

    // "rare et unique" : recherche partielle (pas le titre entier), insensible à la casse —
    // preuve que le matching est un vrai "contains", pas une égalité stricte.
    await page.getByPlaceholder('Rechercher une annonce par titre, ville...').fill('RARE ET UNIQUE')

    // Débounce 350ms côté client avant l'appel réseau — attendre la mise à jour du DOM plutôt
    // qu'un délai fixe. Un seul résultat prouve à la fois que la recherche matche bien la bonne
    // annonce ET qu'aucune des 20 "fillers" ne reste affichée.
    await expect(page.getByTestId('select-property-card')).toHaveCount(1, { timeout: 15000 })
    await expect(page.getByText(FINDABLE_TITLE)).toBeVisible()
    await expect(page.getByRole('button', { name: /Voir plus d.annonces/i })).toHaveCount(0)

    // Effacer la recherche restaure la pagination normale (première page complète).
    await page.getByLabel('Effacer la recherche').click()
    await expect(page.getByTestId('select-property-card')).toHaveCount(PAGE_SIZE, { timeout: 15000 })
  })
})
