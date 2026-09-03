import crypto from 'node:crypto'
import path from 'node:path'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import {
  deleteAdCampaigns,
  findAdCampaignByOwner,
  getUserCredits,
  seedAnnouncerUser,
} from './helpers/firebase-admin'

/**
 * Preuve de bout en bout, vraie écriture Firestore + Storage, pour le module Publicité
 * (self-serve, /advertising) — demande explicite de l'utilisateur avant d'en faire la
 * promotion publique : il veut la certitude que le parcours "un business paie en crédits
 * et sa pub part en ligne" fonctionne réellement, pas seulement que l'UI s'affiche.
 *
 * Contrairement aux réels/annonces (SDK client Firebase, session Firebase réelle requise), le
 * module Publicité authentifie uniquement via la session NextAuth (`auth()`, voir
 * /api/advertising/campaigns/route.ts et /api/advertising/upload/route.ts) — l'upload et la
 * création de campagne passent tous les deux par l'Admin SDK côté serveur, jamais par le SDK
 * client. Le cookie NextAuth forgé de signInAsAnnouncer() suffit donc seul ; pas besoin de
 * mockCommonAppNoise(page, { mockFirebaseToken: false }) ni du pont /api/generate-token.
 *
 * RUN_ID unique par worker (crypto.randomUUID()) : fullyParallel peut répartir les tests sur
 * des workers séparés (même raison que les autres specs de ce dossier).
 */
const RUN_ID = crypto.randomUUID()
const AD_IMAGE_PATH = path.join(process.cwd(), 'public', 'og-image.png')
// Même viewport que lot4-mobile-advertising.spec.ts (existant, mocké) : le bouton "suivant" du
// wizard n'a le libellé accessible "Continuer vers l'étape N" (aria-label) que sur son rendu
// mobile — le pied de page desktop est un `<Button>` texte "Suivant" séparé, sans cet
// aria-label (voir AdvertisingCreateWizard.tsx, les deux <footer> distincts).
const MOBILE_SIZE = { width: 390, height: 844 }

async function goToMessageStep(page: import('@playwright/test').Page) {
  await page.goto('/advertising/create', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /Créer une publicité/i })).toBeVisible()
  // Le forfait "Marque" (70 crédits, tous les emplacements) est présélectionné par défaut —
  // aucun clic de sélection nécessaire, seule sa présence confirme l'étape chargée.
  await expect(page.getByRole('button', { name: /Marque.*70 crédits.*17\s?500/i })).toBeVisible()

  await page.getByRole('button', { name: /Continuer vers l’étape 2/i }).click()
  await expect(page.getByRole('heading', { name: /Ajouter les visuels/i })).toBeVisible()

  // Upload réel : passe par POST /api/advertising/upload (Admin SDK), écrit vraiment dans
  // Firebase Storage — aucun mock de route ici, contrairement à lot4-mobile-advertising.spec.ts.
  await page.locator('#default-ad-image').setInputFiles(AD_IMAGE_PATH)
  await expect(page.getByText(/5\/5 emplacements prêts/i)).toBeVisible({ timeout: 20_000 })

  await page.getByRole('button', { name: /Continuer vers l’étape 3/i }).click()
  await expect(page.getByRole('heading', { name: /Préparer le message/i })).toBeVisible()
}

async function fillMessageAndPreview(page: import('@playwright/test').Page, headline: string) {
  await page.getByLabel(/Accroche/i).fill(headline)
  await page.getByLabel(/Description courte/i).fill('Visuel de test e2e réel, pas un mock.')
  await page.getByLabel(/Lien au clic/i).fill('wa.me/24166545430')
  await page.getByLabel(/Lien au clic/i).blur()

  await page.getByRole('button', { name: /Continuer vers l’étape 4/i }).click()
  await expect(page.getByRole('heading', { name: /Vérifier avant publication/i })).toBeVisible()
}

test.describe('Module Publicité (/advertising) — vraie création de campagne, Firestore + Storage réels', () => {
  test.describe.configure({ mode: 'serial' })
  test.use({ viewport: MOBILE_SIZE })

  const SOLVENT_UID = `e2e-ad-solvent-${RUN_ID}`
  const INSOLVENT_UID = `e2e-ad-insolvent-${RUN_ID}`
  let createdCampaignId = ''

  test.beforeAll(async () => {
    // "brand" coûte 70 crédits (src/constantes/ad-packages.ts) — 100 est confortablement
    // suffisant, 50 est volontairement insuffisant pour le second test.
    await seedAnnouncerUser(SOLVENT_UID, 100)
    await seedAnnouncerUser(INSOLVENT_UID, 50)
  })

  test.afterAll(async () => {
    if (createdCampaignId) {
      await deleteAdCampaigns([createdCampaignId])
    }
  })

  test('parcours complet : paie en crédits, la campagne part réellement en ligne, les crédits sont réellement débités', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: SOLVENT_UID })
    await mockCommonAppNoise(page)

    await goToMessageStep(page)
    await fillMessageAndPreview(page, 'Promo e2e réelle Akanda')

    await expect(page.getByText(/70 crédits/i).first()).toBeVisible()
    const publishButton = page.getByRole('button', { name: /Payer.*publier/i })
    await expect(publishButton).toBeEnabled()
    await publishButton.click()

    // Vraie redirection après un vrai 201 de POST /api/advertising/campaigns (pas un mock).
    await expect(page).toHaveURL(/\/advertising$/, { timeout: 30_000 })

    // Preuve définitive côté données : la campagne existe réellement en base, avec le bon
    // débit de crédits — pas juste l'apparence du toast/de la redirection côté UI. Le client
    // ne renvoie l'id de campagne que dans la réponse JSON de la mutation, jamais dans l'URL :
    // on ne peut le retrouver qu'en interrogeant par `createdBy`.
    await expect.poll(async () => (await findAdCampaignByOwner(SOLVENT_UID))?.id, { timeout: 15000 }).not.toBeUndefined()

    const found = await findAdCampaignByOwner(SOLVENT_UID)
    createdCampaignId = found!.id
    const campaign = found!.data as any

    expect(campaign.status).toBe('active')
    expect(campaign.billing?.mode).toBe('user_credits')
    expect(campaign.billing?.paymentStatus).toBe('paid')
    expect(campaign.billing?.creditsUsed).toBe(70)
    expect(campaign.creative?.ctaUrl).toBe('https://wa.me/24166545430')
    expect(campaign.creative?.headline).toBe('Promo e2e réelle Akanda')
    expect(campaign.placements).toEqual(
      expect.arrayContaining(['search_infeed', 'property_detail', 'home', 'immobilier_infeed', 'reels_infeed']),
    )

    // Le vrai compte de l'utilisateur a bien été débité (100 - 70 = 30), pas seulement le
    // `creditsRemaining` renvoyé dans la réponse JSON.
    await expect.poll(() => getUserCredits(SOLVENT_UID), { timeout: 15000 }).toBe(30)

    // Apparaît réellement sur le dashboard après la redirection, pas juste en base.
    await expect(page.getByRole('heading', { name: 'Promo e2e réelle Akanda' })).toBeVisible({ timeout: 15000 })
  })

  test('crédits insuffisants : la campagne n est pas créée et aucun crédit n est débité', async ({ page }) => {
    test.setTimeout(90_000)
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: INSOLVENT_UID })
    await mockCommonAppNoise(page)

    await goToMessageStep(page)
    await fillMessageAndPreview(page, 'Ne devrait jamais être publiée')

    const publishButton = page.getByRole('button', { name: /Payer.*publier/i })
    await publishButton.click()

    // Vrai 402 de POST /api/advertising/campaigns (50 < 70 crédits requis) — reste sur l'étape
    // de récapitulatif, affiche le toast d'erreur, n'est jamais redirigé vers /advertising.
    // .first() : le toast (texte visible) ET la région aria-live (annonce lecteur d'écran)
    // portent le même texte — strict mode Playwright refuse sinon de choisir entre les deux.
    await expect(page.getByText(/Crédits insuffisants/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/\/advertising\/create$/)

    // Preuve définitive côté données : aucune campagne créée, crédits inchangés — le rejet
    // n'est pas qu'un message UI qui masquerait une écriture partielle en base.
    expect(await findAdCampaignByOwner(INSOLVENT_UID)).toBeNull()
    expect(await getUserCredits(INSOLVENT_UID)).toBe(50)
  })
})
