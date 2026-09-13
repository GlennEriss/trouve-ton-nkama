import crypto from 'node:crypto'
import path from 'node:path'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import {
  deleteProperties,
  deleteUserDoc,
  findPropertiesByOwner,
  getProperty,
  seedAnnouncerUser,
  seedCategoryListing,
} from './helpers/firebase-admin'

/**
 * Demande directe de l'utilisateur : publier une vraie annonce immobilière ET une vraie annonce
 * Mode via leurs formulaires réels, puis vérifier que les deux apparaissent bien sur /property
 * (AdManagementPage.tsx, "Gestion des annonces"), chacune sous le bon onglet — "Immobilier" pour
 * la première, "Mode" pour la seconde. Aucun des deux parcours de création n'avait de couverture
 * e2e allant jusqu'à une vraie écriture Firestore avant ce test (seul le seed via Admin SDK
 * existait, voir seedProperties/seedCategoryListing dans firebase-admin.ts).
 *
 * Immobilier : formulaire manuel classique (/property/add/studio, 3 étapes) — délibérément PAS
 * le nouveau flux IA (/property/create), qui dépend de Gemini et de crédits ; le flux manuel est
 * déterministe. Mode : AUCUNE alternative manuelle n'existe pour category-listing/create — c'est
 * intégralement un flux IA (description + photos -> Gemini choisit catégorie/titre/attributs),
 * donc ce second scénario dépend nécessairement de Gemini ; description volontairement explicite
 * et sans ambiguïté pour fiabiliser la détection de catégorie.
 *
 * Les deux formulaires écrivent via createProperty() (SDK Firestore CLIENT, addDoc) — exige une
 * vraie session Firebase Auth (firestore.rules: isAnnouncer()), pas seulement le cookie NextAuth
 * forgé. Même recette que property-add-reel.spec.ts : seedAnnouncerUser (Admin SDK) +
 * signInAsAnnouncer + mockCommonAppNoise(page, { mockFirebaseToken: false }) (laisse le vrai
 * pont /api/generate-token -> signInWithCustomToken s'exécuter).
 *
 * Le flux Mode lit le contact depuis le profil (user.callNumber || user.phoneNumbers?.[0]) sans
 * aucun champ téléphone dans son UI — contrairement au formulaire immobilier, l'utilisateur de
 * test doit donc être seedé avec un numéro, sinon la génération est bloquée avant même l'appel
 * IA ("Ajoute un numéro de téléphone à ton profil avant de publier.").
 *
 * L'id de chaque annonce n'est pas connu à l'avance : createProperty() génère l'id côté client
 * (addDoc) et le formulaire immobilier ne le met même pas dans son URL de succès
 * (/property?submitted=1, sans id) — on ne peut retrouver les annonces qu'en interrogeant par
 * createdBy (findPropertiesByOwner, nouveau helper, même principe que findReelByOwner).
 *
 * RUN_ID unique par worker (crypto.randomUUID()) : même raison que les autres specs de ce
 * dossier — fullyParallel peut répartir les tests sur des workers séparés.
 *
 * Zones multiples (voir docs/marketplace-multi-categories/08-zones-multiples-mode.md) :
 * MODE_DESCRIPTION mentionne explicitement DEUX villes ("Libreville et Franceville") pour
 * vérifier que l'IA les détecte toutes les deux, pas seulement la première — c'est
 * exactement le problème remonté par de vrais vendeurs (un vendeur qui livre dans plusieurs
 * villes). Un test dédié édite ensuite manuellement les zones sur la page de preview
 * (/category-listing/create/preview/[id], l'URL exacte à l'origine de la demande), et un
 * dernier test seed directement une annonce Mode à l'ANCIEN format (city/province seuls,
 * sans `zones`) pour prouver la rétrocompatibilité sans dépendre de Gemini.
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-property-mode-${RUN_ID}`
const PROPERTY_TITLE = `Studio test création e2e ${RUN_ID}`
const MODE_DESCRIPTION =
  `Je vends une robe en wax taille M, portée deux fois, très bon état. Disponible à ` +
  `Libreville et Franceville. Prix 15 000 FCFA, légèrement négociable. Référence test ${RUN_ID}.`

test.describe('Publication d\'une annonce immobilière et d\'une annonce Mode — vrai Firestore/Storage', () => {
  test.describe.configure({ mode: 'serial' })

  let propertyId = ''
  let modeListingId = ''
  let modeListingTitle = ''
  const legacyModeListingId = `e2e-legacy-mode-${RUN_ID}`

  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 5, { phoneNumbers: ['+24166545430'] })
  })

  test.afterAll(async () => {
    const ids = [propertyId, modeListingId, legacyModeListingId].filter(Boolean)
    if (ids.length > 0) {
      await deleteProperties(ids)
    }
    await deleteUserDoc(OWNER_UID)
  })

  test('publie une annonce immobilière (studio) via le vrai formulaire manuel', async ({ page }) => {
    // Généreux (défaut 30s) : compression d'image + upload Storage + écriture Firestore
    // réels, potentiellement ralentis par la contention entre projets Playwright en parallèle.
    test.setTimeout(90_000)
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/property/add/studio', { waitUntil: 'domcontentloaded' })

    // Étape 1
    await page.getByLabel('Ajouter des images du bien').setInputFiles(
      path.join(process.cwd(), 'public', 'apple-touch-icon.png'),
    )
    await expect(page.getByText('1/10 images')).toBeVisible({ timeout: 60000 })
    await page.getByLabel("Titre de l'annonce").fill(PROPERTY_TITLE)
    await page.getByLabel("Description de l'annonce").fill(
      `Studio meublé et lumineux, proche des commerces. Test e2e de création ${RUN_ID}.`,
    )
    await page.getByLabel('Superficie du bien en mètres carrés').fill('28')
    await page.getByLabel('Prix du bien en FCFA').fill('120000')
    // isOwner : requis, sans valeur par défaut (contrairement à status) — un div cliquable, pas
    // un input natif.
    await page.getByText('Propriétaire direct', { exact: true }).click()
    // tags : requis (non vide), sans valeur par défaut — un seul tag suffit.
    await page.getByRole('button', { name: /^Sélectionner le tag/ }).first().click()
    await page.getByRole('button', { name: /^Suivant$/i }).click()

    // Étape 2 : tous les champs (Studio + Logement) ont une valeur par défaut (0 ou '01') —
    // aucune interaction nécessaire, confirmé par lot8b-property-forms.spec.ts.
    await expect(page.getByText('Numéro du studio', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: /^Suivant$/i }).click()

    // Étape 3 : localisation + contact
    await expect(page.getByText('Localisation du bien').first()).toBeVisible({ timeout: 15000 })

    await page.locator('#property-province').click()
    await page.getByRole('option', { name: 'Estuaire' }).click()

    await page.locator('#property-city').fill('Libreville')
    await page.locator('#property-city-suggestions').getByRole('option').first().click({ timeout: 15000 })

    await page.locator('#property-district').fill('Glass')
    await page.locator('#property-district-suggestions').getByRole('option').first().click({ timeout: 15000 })

    // Déjà pré-rempli depuis le profil (phoneNumbers seedé plus haut) — inutile de le
    // re-remplir. Le champ existe en double dans le DOM (mise en page mobile + desktop en
    // parallèle, comme ailleurs dans cette suite), d'où .first() plutôt qu'un match strict.
    await expect(page.getByLabel('Numéro de téléphone national').first()).toHaveValue('66545430')

    await page.getByRole('button', { name: /^Enregistrer$/i }).click()

    // Généreux : cette étape fait un vrai upload Storage + une vraie écriture Firestore
    // (addDoc) — sous contention (plusieurs projets Playwright en parallèle sur ce même flux
    // lourd), ça peut dépasser largement un simple aller-retour réseau.
    await expect(page.getByText('Propriété ajoutée avec succès!').first()).toBeVisible({ timeout: 40000 })
    await expect(page).toHaveURL(/\/property\?submitted=1/, { timeout: 15000 })

    // Preuve définitive côté données, pas juste le toast : le document existe réellement en
    // base, avec typeProperty renseigné (c'est justement ce qui la classe "Immobilier" côté
    // /api/announcer/ads, voir resolveScope()).
    await expect.poll(async () => (await findPropertiesByOwner(OWNER_UID)).length, { timeout: 15000 })
      .toBeGreaterThan(0)
    const created = (await findPropertiesByOwner(OWNER_UID)).find((p) => p.data.typeProperty)
    expect(created).toBeTruthy()
    propertyId = created!.id
    expect(created!.data.title).toBe(PROPERTY_TITLE)
  })

  test('publie une annonce Mode via le générateur IA (description + photo)', async ({ page }) => {
    // Généreux (défaut 30s) : upload Storage + appel Gemini + écriture Firestore réels,
    // potentiellement ralentis par la contention entre projets Playwright en parallèle.
    test.setTimeout(90_000)
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/category-listing/create', { waitUntil: 'domcontentloaded' })

    // Le bouton "Générer" dépend de GET /api/categories/publishable-leaves (useQuery,
    // sans attente explicite au montage) : sur un premier hit de la route en dev
    // (compilation Turbopack à froid), un clic trop rapide tombe sur `leaves: []` et
    // affiche "Aucune catégorie n'accepte de nouvelles annonces pour le moment." avant même
    // d'appeler Gemini — flaky observé en e2e réel, pas un bug produit. On attend la réponse
    // avant d'interagir.
    await page
      .waitForResponse((response) => response.url().includes('/api/categories/publishable-leaves'), {
        timeout: 30000,
      })
      .catch(() => {})

    await page.getByPlaceholder(/Ex : Robe Zara/i).fill(MODE_DESCRIPTION)
    await page.locator('input[type="file"]').setInputFiles(
      path.join(process.cwd(), 'public', 'apple-touch-icon.png'),
    )
    await expect(page.getByText('1 photo', { exact: true })).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: /Générer l.annonce/i }).click()

    // Upload de la photo + appel IA (Gemini) : plus lent qu'un aller-retour réseau simple.
    await expect(page).toHaveURL(/\/category-listing\/create\/preview\//, { timeout: 45000 })

    const url = page.url()
    modeListingId = url.split('/preview/')[1]?.split(/[/?#]/)[0] ?? ''
    expect(modeListingId).toBeTruthy()

    // Preuve définitive côté données : le document existe réellement, SANS typeProperty (c'est
    // justement ce qui la classe "Mode"/marketplace côté /api/announcer/ads, voir
    // resolveScope() — categoryId seul n'est pas fiable, un backfill l'a posé sur presque
    // toutes les annonces).
    const modeListing = await getProperty(modeListingId)
    expect(modeListing).toBeTruthy()
    expect(modeListing?.typeProperty).toBeFalsy()
    expect(typeof modeListing?.title).toBe('string')
    modeListingTitle = modeListing!.title as string

    // Zones multiples : la description mentionne Libreville ET Franceville, l'IA doit les
    // détecter toutes les deux (pas seulement la première) — voir
    // docs/marketplace-multi-categories/08-zones-multiples-mode.md §6.
    const cities = (modeListing?.cities as string[] | undefined) ?? []
    expect(cities).toContain('Libreville')
    expect(cities).toContain('Franceville')
    expect(cities.length).toBeGreaterThanOrEqual(2)
    // city (singulier, rétrocompatibilité) = zone primaire = premier élément de cities.
    expect(modeListing?.city).toBe(cities[0])
    const zones = (modeListing?.zones as Array<{ city: string }> | undefined) ?? []
    expect(zones.map((zone) => zone.city)).toEqual(cities)
  })

  test('édite les zones sur la page de preview — ajoute une 3e ville, en retire une', async ({ page }) => {
    test.skip(!modeListingId, 'Dépend de la publication Mode précédente (même run, mode serial).')
    test.setTimeout(60_000)
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto(`/category-listing/create/preview/${modeListingId}`, { waitUntil: 'domcontentloaded' })

    // Ajout d'une 3e zone via l'éditeur dédié (EditableZonesField).
    await page.getByPlaceholder(/Ajouter une ville/i).fill('Port-Gentil')
    await page.getByRole('button', { name: /^Ajouter$/i }).click()
    await expect(page.getByText('Port-Gentil', { exact: true })).toBeVisible({ timeout: 15000 })

    await expect.poll(async () => {
      const property = await getProperty(modeListingId)
      return (property?.cities as string[] | undefined)?.length ?? 0
    }, { timeout: 15000 }).toBe(3)

    // Retrait d'une zone (Franceville) — clic sur son bouton de suppression.
    await page.getByLabel('Retirer Franceville').click()
    await expect(page.getByText('Franceville', { exact: true })).toHaveCount(0)

    await expect.poll(async () => {
      const property = await getProperty(modeListingId)
      return (property?.cities as string[] | undefined) ?? []
    }, { timeout: 15000 }).toEqual(['Libreville', 'Port-Gentil'])
  })

  test('les deux annonces apparaissent bien sur /property, respectivement sous Immobilier et Mode', async ({
    page,
  }) => {
    test.skip(!propertyId || !modeListingId, 'Dépend des deux publications précédentes (même run, mode serial).')

    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await page.goto('/property', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Gestion des annonces' })).toBeVisible()

    // Onglet "Immobilier" actif par défaut.
    const immobilierTab = page.getByRole('tab', { name: /Immobilier/ })
    await expect(immobilierTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText(PROPERTY_TITLE)).toBeVisible({ timeout: 15000 })

    // L'annonce Mode ne doit PAS apparaître sous cet onglet.
    await expect(page.getByText(modeListingTitle)).toHaveCount(0)

    const modeTab = page.getByRole('tab', { name: /Mode/ })
    await modeTab.click()
    await expect(modeTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText(modeListingTitle)).toBeVisible({ timeout: 15000 })

    // Zones multiples (après le test d'édition précédent : Libreville + Port-Gentil) —
    // resolveAdLocation() doit afficher les deux villes, pas seulement la première. Voir
    // docs/marketplace-multi-categories/08-zones-multiples-mode.md.
    await expect(page.getByText('Libreville, Port-Gentil')).toBeVisible()

    // Et inversement, l'annonce immobilière ne doit plus apparaître sous "Mode".
    await expect(page.getByText(PROPERTY_TITLE)).toHaveCount(0)
  })

  test('annonce Mode à l\'ANCIEN format (city/province seuls, sans zones) s\'affiche normalement', async ({
    page,
  }) => {
    // Rétrocompatibilité (voir docs/marketplace-multi-categories/08-zones-multiples-mode.md
    // §7) : une annonce créée avant l'introduction de `zones` n'a jamais ce champ. Seed
    // direct (Admin SDK), pas de dépendance à Gemini — reproduit fidèlement une annonce Mode
    // réelle d'avant ce chantier.
    const legacyTitle = `Sac légère e2e ${RUN_ID}`
    await seedCategoryListing(OWNER_UID, {
      id: legacyModeListingId,
      title: legacyTitle,
      description: 'Sac à main en cuir, jamais porté.',
      price: 12000,
      province: 'Estuaire',
      city: 'Libreville',
      categoryId: 'mode-robes',
      categoryLeaf: 'Robes',
    })

    await page.goto(`/annonce/${legacyModeListingId}`, { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: legacyTitle })).toBeVisible({ timeout: 15000 })
    // Une seule puce de zone, la ville seule (repli de getListingZones() sur city/province
    // singuliers) — comportement identique à avant l'introduction de `zones`.
    await expect(page.getByText('Libreville', { exact: true })).toBeVisible()
  })
})
