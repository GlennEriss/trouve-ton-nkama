import crypto from 'node:crypto'

import { expect, test } from '@playwright/test'

import {
  deleteSearchRequests,
  getSearchRequest,
  simulateSearchRequestPaymentConfirmed,
} from './helpers/firebase-admin'

/**
 * Preuve de bout en bout, décision explicite prise avec l'utilisateur : ce test appelle pour de
 * vrai `/api/search-requests/initiate`, qui proxy vers la Cloud Function
 * `initiateSearchRequestPayment` — laquelle fait un vrai appel HTTP à l'API MyPayGa live
 * (https://api.mypayga.com, aucun sandbox documenté dans ce dépôt). Si l'initiation aboutit,
 * MyPayGa envoie une vraie invite de paiement Mobile Money au numéro payeur ci-dessous — sans
 * risque (aucun argent ne bouge sans code MoMo saisi sur ce téléphone), mais un vrai effet de
 * bord externe à chaque exécution. Numéro fourni explicitement par l'utilisateur pour cet usage.
 *
 * Pour ne PAS déclencher de vrai paiement, ce test ne va pas plus loin que l'initiation : la
 * confirmation (ce que ferait normalement le webhook MyPayGa signé, voir
 * functions/src/payments/search-requests/webhook.ts) est simulée directement en base via Admin
 * SDK (simulateSearchRequestPaymentConfirmed), jamais via un vrai callback MyPayGa.
 *
 * `test.skip` restreint volontairement ce test à un seul projet Playwright : le répéter sur
 * plusieurs viewports enverrait plusieurs vraies invites de paiement au même numéro à chaque
 * exécution complète de la suite.
 */
test.describe('Publication réelle d\'une demande de recherche — /demandes-recherche/publier', () => {
  const RUN_ID = crypto.randomUUID()
  const SHORT_ID = RUN_ID.slice(0, 8)
  const DESCRIPTION = `Recherche e2e création réelle appartement meublé ${SHORT_ID}`
  const WHATSAPP_CONTACT = '066112233'
  // Numéro payeur réel, fourni explicitement par l'utilisateur pour ce test — voir le
  // commentaire d'en-tête. Format Airtel Money (074/076/077 + 6 chiffres).
  const PAYER_PHONE = '077401202'

  let createdTransactionId: string | null = null

  test.afterAll(async () => {
    if (createdTransactionId) {
      await deleteSearchRequests([createdTransactionId])
    }
  })

  test('remplit le formulaire, initie un vrai paiement MyPayGa, puis confirme via webhook simulé', async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== 'chromium-desktop-dev',
      'Test à coût réel (vrai appel MyPayGa live) : ne tourner que sur un seul projet Playwright.',
    )
    test.setTimeout(60_000)

    await page.goto('/demandes-recherche/publier', { waitUntil: 'domcontentloaded' })

    await page.getByRole('combobox', { name: 'Type de bien' }).click()
    await page.getByRole('option', { name: 'Studio', exact: true }).click()

    // Location ou vente (FOR_RENT) et Province (Estuaire, dont la capitale est Libreville)
    // restent sur leur valeur par défaut — pas besoin d'y toucher pour ce scénario.

    await page.getByPlaceholder('Ex: Libreville').fill('Libreville')
    // Aucun de ces champs n'a de <label htmlFor>/id lié (juste un <label>/<p> visuel suivi de
    // l'input) — getByLabel ne fonctionne donc pas ici. On remonte du texte du label vers son
    // input frère par xpath, seule façon fiable de désambiguïser des placeholders parfois
    // identiques (WhatsApp et le numéro payeur affichent tous deux "074 XX XX XX" par défaut).
    await page.locator('label', { hasText: 'Budget min (FCFA)' }).locator('xpath=following-sibling::input').fill('80000')
    await page.locator('label', { hasText: 'Budget max (FCFA)' }).locator('xpath=following-sibling::input').fill('150000')
    await page
      .getByPlaceholder(/Je cherche un studio meublé/)
      .fill(DESCRIPTION)
    await page
      .locator('label', { hasText: 'Votre numéro WhatsApp' })
      .locator('xpath=following-sibling::input')
      .fill(WHATSAPP_CONTACT)
    // Le numéro payeur n'est pas un frère direct de son <p> label (une grille de boutons réseau
    // s'intercale) — voir SearchRequestForm.tsx : <p>, puis le div des boutons réseau, puis le
    // div "relative" contenant l'icône Smartphone + l'input.
    await page
      .locator('p', { hasText: 'Votre numéro Mobile Money' })
      .locator('xpath=following-sibling::div[2]//input')
      .fill(PAYER_PHONE)

    const submitButton = page.getByRole('button', { name: /Publier ma recherche/ })
    await expect(submitButton).toBeEnabled({ timeout: 10000 })

    const [initiateResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/search-requests/initiate') && res.request().method() === 'POST',
        { timeout: 20000 },
      ),
      submitButton.click(),
    ])

    expect(initiateResponse.ok()).toBe(true)
    const initiateBody = await initiateResponse.json()
    expect(initiateBody.success).toBe(true)
    expect(typeof initiateBody.transactionId).toBe('string')
    createdTransactionId = initiateBody.transactionId as string

    // Preuve que l'initiation a réellement abouti côté MyPayGa (pas juste que la requête HTTP a
    // été envoyée) : l'UI ne passe en "waiting_confirmation" que si la Cloud Function a reçu un
    // 200 de MyPayGa, voir use-search-request-payment.ts.
    await expect(page.getByText('Confirme le paiement sur ton téléphone')).toBeVisible({ timeout: 10000 })

    const pendingDoc = await getSearchRequest(createdTransactionId)
    expect(pendingDoc?.paymentStatus).toBe('pending_confirmation')
    expect(pendingDoc?.moderationStatus).toBeNull()

    // On s'arrête ici côté MyPayGa (pas de vrai code MoMo saisi) — la confirmation qui suivrait
    // normalement un vrai callback signé est simulée directement en base, voir l'en-tête.
    await simulateSearchRequestPaymentConfirmed(createdTransactionId, { boostRequested: false })

    // Le polling client (3 s d'intervalle, use-search-request-payment.ts) doit détecter la
    // confirmation et afficher l'écran de succès.
    await expect(page.getByText('Demande envoyée, merci !')).toBeVisible({ timeout: 15000 })

    const confirmedDoc = await getSearchRequest(createdTransactionId)
    expect(confirmedDoc?.typeProperty).toBe('Studio')
    expect(confirmedDoc?.transactionType).toBe('FOR_RENT')
    expect(confirmedDoc?.city).toBe('Libreville')
    expect(confirmedDoc?.budgetMinXaf).toBe(80000)
    expect(confirmedDoc?.budgetMaxXaf).toBe(150000)
    expect(confirmedDoc?.description).toBe(DESCRIPTION)
    expect(confirmedDoc?.whatsappContact).toBe(WHATSAPP_CONTACT)
    expect(confirmedDoc?.paymentStatus).toBe('confirmed')
    expect(confirmedDoc?.moderationStatus).toBe('PENDING')
    expect(confirmedDoc?.state).toBe('IN_PROGRESS')
    expect(confirmedDoc?.boostPaid).toBe(false)
    expect(confirmedDoc?.amountPaidXaf).toBe(500)
  })
})
