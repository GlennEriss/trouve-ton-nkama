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
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-property-mode-${RUN_ID}`
const PROPERTY_TITLE = `Studio test création e2e ${RUN_ID}`
const MODE_DESCRIPTION =
  `Je vends une robe en wax taille M, portée deux fois, très bon état, à Libreville. ` +
  `Prix 15 000 FCFA, légèrement négociable. Référence test ${RUN_ID}.`

test.describe('Publication d\'une annonce immobilière et d\'une annonce Mode — vrai Firestore/Storage', () => {
  test.describe.configure({ mode: 'serial' })

  let propertyId = ''
  let modeListingId = ''
  let modeListingTitle = ''

  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 5, { phoneNumbers: ['+24166545430'] })
  })

  test.afterAll(async () => {
    const ids = [propertyId, modeListingId].filter(Boolean)
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

    // Et inversement, l'annonce immobilière ne doit plus apparaître sous "Mode".
    await expect(page.getByText(PROPERTY_TITLE)).toHaveCount(0)
  })
})
