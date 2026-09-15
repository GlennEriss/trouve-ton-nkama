import crypto from 'node:crypto'
import path from 'node:path'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { deleteProperties, deleteUserDoc, getProperty, seedAnnouncerUser } from './helpers/firebase-admin'

/**
 * Bug prod réel (voir annonce https://www.tonnkama.com/annonce/VysA1qX7r7wITgNfcgQi) :
 * whatsappContact/callContact étaient pré-remplis/écrasés avec le numéro personnel du compte
 * connecté dès que l'IA laissait ces deux champs vides (cas normal : un seul numéro dans la
 * description) — écrasant silencieusement le numéro propre à l'annonce. Corrigé dans
 * `/property/create/page.tsx` (handleGenerate).
 *
 * Ce test passe par le vrai flux `/property/create` (upload Storage + écriture Firestore réels,
 * même recette que property-and-mode-creation.spec.ts) mais intercepte `/api/ai/property-draft`
 * pour éviter un vrai appel Gemini (coût + non-déterminisme) — seule la fusion des champs de
 * contact entre la réponse IA et l'écriture Firestore est sous test, pas Gemini lui-même.
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-create-ai-contact-${RUN_ID}`
// Numéro personnel du compte connecté — ne doit JAMAIS finir dans whatsappContact/callContact
// de l'annonce créée.
const OWNER_PHONE = '+24174782158'
// Numéro propre à l'annonce (celui que l'IA extrait de la description) — doit être seul à
// apparaître dans whatsappContact/callContact ET sur les boutons de la page preview.
const LISTING_CONTACT = '+24177001111'

test.describe('Création IA (/property/create) — le contact de l\'annonce ne doit jamais être remplacé par le numéro du compte connecté', () => {
  let propertyId = ''

  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 169, { phoneNumbers: [OWNER_PHONE] })
  })

  test.afterAll(async () => {
    if (propertyId) await deleteProperties([propertyId])
    await deleteUserDoc(OWNER_UID)
  })

  test('un seul numéro dans la description -> whatsappContact/callContact restent vides, jamais le numéro du compte connecté', async ({ page }) => {
    test.setTimeout(90_000)
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID, phoneNumbers: [OWNER_PHONE] })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })

    // Réponse IA scriptée et déterministe : un seul numéro dans la description -> `contact`
    // renseigné, whatsappContact/callContact volontairement absents (comportement réel du
    // prompt, voir getAutoFillPromptWithTypeDetection règle 24).
    await page.route('**/api/ai/property-draft', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            typeProperty: 'Home',
            title: `Belle maison e2e contact ${RUN_ID}`,
            description: `Description de test pour vérifier le contact, référence ${RUN_ID}.`,
            price: 250000,
            area: 90,
            status: 'FOR_RENT',
            tags: ['Meublé'],
            contact: LISTING_CONTACT,
          },
        }),
      })
    })

    await page.goto('/property/create', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Description du bien').fill(
      `Belle maison à louer, contact ${LISTING_CONTACT}. Référence e2e ${RUN_ID}.`,
    )
    await page.locator('input[type="file"]').setInputFiles(
      path.join(process.cwd(), 'public', 'apple-touch-icon.png'),
    )

    await page.locator('#property-province').click()
    await page.getByRole('option', { name: 'Estuaire' }).click()
    await page.locator('#property-city').fill('Libreville')
    await page.locator('#property-city-suggestions').getByRole('option').first().click({ timeout: 15000 })
    await page.locator('#property-district').fill('Glass')
    await page.locator('#property-district-suggestions').getByRole('option').first().click({ timeout: 15000 })

    const generateButton = page.getByRole('button', { name: /Générer l'annonce/ })
    await expect(generateButton).toBeEnabled({ timeout: 15000 })
    await generateButton.click()

    // Redirection vers la preview seulement après une vraie écriture Firestore réussie.
    await page.waitForURL(/\/property\/create\/preview\/[^/]+$/, { timeout: 60000 })
    propertyId = page.url().split('/').pop()!

    // 1) Vérification directe côté Firestore : le coeur du bug.
    await expect
      .poll(async () => (await getProperty(propertyId))?.contact, { timeout: 5000 })
      .toBe(LISTING_CONTACT)
    const created = await getProperty(propertyId)
    expect(created?.whatsappContact ?? '').toBe('')
    expect(created?.callContact ?? '').toBe('')
    expect(created?.whatsappContact).not.toBe(OWNER_PHONE)
    expect(created?.callContact).not.toBe(OWNER_PHONE)

    // 2) Vérification visuelle : les boutons "Choisissez un moyen de contact" de la page preview
    // (même ContactSection.tsx que /annonce/[id]) doivent retomber sur le numéro de l'annonce,
    // jamais sur celui du compte connecté — exactement le symptôme rapporté par le client.
    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const whatsappLink = page.getByTitle('Contacter via WhatsApp')
    await expect(whatsappLink).toBeVisible()
    await expect(whatsappLink).toHaveAttribute('href', new RegExp(`wa\\.me/${escapeRegExp(LISTING_CONTACT)}`))
    await expect(whatsappLink).not.toHaveAttribute('href', new RegExp(`wa\\.me/${escapeRegExp(OWNER_PHONE)}`))

    await page.getByTitle('Afficher le numéro de téléphone').click()
    await expect(page.getByText(LISTING_CONTACT, { exact: true })).toBeVisible()
    await expect(page.getByText(OWNER_PHONE, { exact: true })).not.toBeVisible()
  })
})
