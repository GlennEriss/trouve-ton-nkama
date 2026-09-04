import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import '../../node/slow-buffer-compat';
import { logger } from 'firebase-functions'
import { onRequest } from 'firebase-functions/v2/https'
import { adminDB } from '../../admin'
import { generateTransactionId } from '../airtel/config'
import { MYPAYGA_SECRETS, getMyPayGaConfig, isPhoneValidForNetwork, normalizeMyPayGaNetwork, toGabonE164, toLocalPhone } from '../mypayga/config'
import {
  SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH,
  SEARCH_REQUEST_MAX_PENDING_PER_PHONE_PER_HOUR,
  computeSearchRequestAmountXaf,
} from './constants'

const SEARCH_REQUESTS_COLLECTION = 'search_requests'

// Initiation d'une demande de recherche (visiteur anonyme, aucun compte requis).
// Même modèle que initiateGiftPayment.ts : le formulaire est validé une première
// fois côté route Next (zod, valeurs de taxonomie), revérifié ici en défense de
// profondeur. Contrairement aux cadeaux, il n'y a pas de cible existante à
// valider (reel/annonce) — le contenu EST la demande elle-même.
export const initiateSearchRequestPayment = onRequest({ secrets: MYPAYGA_SECRETS }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'method_not_allowed' })
    return
  }

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>

  const typeProperty = String(body.typeProperty ?? '').trim()
  const transactionType = String(body.transactionType ?? '').trim()
  const province = String(body.province ?? '').trim()
  const city = String(body.city ?? '').trim()
  const neighborhood = String(body.neighborhood ?? '').trim() || null
  const budgetMinXaf = Number(body.budgetMinXaf)
  const budgetMaxXaf = Number(body.budgetMaxXaf)
  const description = String(body.description ?? '').trim().slice(0, SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH)
  const whatsappContact = toLocalPhone(body.whatsappContact)
  const boostRequested = Boolean(body.boostRequested)

  const providerNetwork = normalizeMyPayGaNetwork(body.network)
  const payerPhone = toLocalPhone(body.payerPhone ?? body.phoneNumber)

  if (!typeProperty || (transactionType !== 'FOR_RENT' && transactionType !== 'FOR_SALE')) {
    res.status(400).json({ success: false, error: 'invalid_type', message: 'Type de bien ou transaction invalide.' })
    return
  }
  if (!province || !city) {
    res.status(400).json({ success: false, error: 'invalid_location', message: 'Ville/province manquante.' })
    return
  }
  if (
    !Number.isFinite(budgetMinXaf) ||
    !Number.isFinite(budgetMaxXaf) ||
    budgetMinXaf < 0 ||
    budgetMaxXaf <= 0 ||
    budgetMinXaf > budgetMaxXaf
  ) {
    res.status(400).json({ success: false, error: 'invalid_budget', message: 'Budget invalide.' })
    return
  }
  if (!description || description.length < 10) {
    res.status(400).json({ success: false, error: 'invalid_description', message: 'Description trop courte.' })
    return
  }
  if (whatsappContact.length !== 9) {
    res.status(400).json({ success: false, error: 'invalid_whatsapp', message: 'Numéro WhatsApp invalide.' })
    return
  }
  if (!isPhoneValidForNetwork(payerPhone, providerNetwork)) {
    res.status(400).json({
      success: false,
      error: 'invalid_phone',
      message: 'Numéro invalide pour ce réseau (Airtel: 074/076/077, Moov: 062/065/066, suivis de 6 chiffres).',
    })
    return
  }

  // Anti-spam : cap de demandes pending par numéro payeur sur 1 h.
  const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000)
  const pendingSnapshot = await adminDB
    .collection(SEARCH_REQUESTS_COLLECTION)
    .where('payerPhone', '==', payerPhone)
    .where('paymentStatus', '==', 'pending_confirmation')
    .where('createdAt', '>', oneHourAgo)
    .limit(SEARCH_REQUEST_MAX_PENDING_PER_PHONE_PER_HOUR)
    .get()
  if (pendingSnapshot.size >= SEARCH_REQUEST_MAX_PENDING_PER_PHONE_PER_HOUR) {
    res.status(429).json({
      success: false,
      error: 'too_many_pending',
      message: 'Trop de paiements en attente pour ce numéro. Réessaie dans une heure.',
    })
    return
  }

  const config = getMyPayGaConfig()
  if (!config.apiKey) {
    res.status(500).json({ success: false, error: 'missing_api_key' })
    return
  }
  if (!config.searchRequestCallbackUrl) {
    res.status(500).json({ success: false, error: 'missing_search_request_callback_url' })
    return
  }

  const amountXaf = computeSearchRequestAmountXaf(boostRequested)

  const transactionId = generateTransactionId()
  const transactionRef = adminDB.collection(SEARCH_REQUESTS_COLLECTION).doc(transactionId)

  // moderationStatus démarre à null (pas 'PENDING') : tant que le paiement
  // n'est pas confirmé, ce brouillon ne doit jamais apparaître dans la file de
  // modération admin — voir packages/core/src/domain/moderation-status.ts.
  await transactionRef.set({
    id: transactionId,
    typeProperty,
    transactionType,
    province,
    city,
    neighborhood,
    budgetMinXaf,
    budgetMaxXaf,
    description,
    // Stocké au format +241... (indicatif Gabon, 0 initial retiré) — demande explicite de
    // l'utilisateur. `whatsappContact` local ci-dessus reste la forme validée (longueur 9,
    // voir plus haut) ; seule la forme persistée change, pour un numéro directement affichable
    // et exploitable dans un lien wa.me sans transformation supplémentaire côté client.
    whatsappContact: toGabonE164(whatsappContact),
    provider: 'mypayga',
    payerPhone,
    payerNetwork: providerNetwork,
    paymentStatus: 'pending_confirmation',
    amountPaidXaf: amountXaf,
    boostRequested,
    boostPaid: false,
    boostStartAt: null,
    boostEndAt: null,
    moderationStatus: null,
    state: 'IN_PROGRESS',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  const payload = {
    urls: {
      callback_url: config.searchRequestCallbackUrl,
      success_url: config.successUrl,
      fail_url: config.failUrl,
    },
    apikey: config.apiKey,
    client_phone: payerPhone,
    amount: String(amountXaf),
    country: config.country,
    network: providerNetwork,
    type: 'mobile_money',
    unique_id: transactionId,
    firstname: 'Visiteur',
    lastname: 'Location Maison',
    email: `search-request+${transactionId.toLowerCase()}@location-maison.invalid`,
    currency: config.currency,
    description: 'Demande de recherche',
  }

  logger.info('Initiation demande de recherche MyPayGa', {
    transactionId,
    amount: amountXaf,
    boostRequested,
    network: providerNetwork,
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const response = await fetch(`${config.apiBaseUrl.replace(/\/+$/, '')}/v1/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const rawResponse = await response.text()
    const parsed = safeJsonParse(rawResponse) ?? {}
    const requestStatus = Number(parsed.request_status ?? parsed.status_request ?? parsed.status ?? 0)
    const providerMessage = String(parsed.message ?? parsed.error ?? 'Paiement initié')
    const providerPaymentToken = String(parsed.payment_token ?? parsed.paymentToken ?? '').trim()

    if (!response.ok || (Number.isFinite(requestStatus) && requestStatus >= 300)) {
      await transactionRef.update({
        paymentStatus: 'failed',
        failureReason: providerMessage,
        updatedAt: FieldValue.serverTimestamp(),
      })

      res.status(502).json({
        success: false,
        error: 'provider_refused',
        message: `MyPayGa a refusé le paiement: ${providerMessage}`,
      })
      return
    }

    await transactionRef.update({
      providerPaymentToken: providerPaymentToken || null,
      updatedAt: FieldValue.serverTimestamp(),
    })

    res.status(200).json({
      success: true,
      transactionId,
      message: `Paiement de ${amountXaf} FCFA initié. Confirme la transaction sur ton téléphone.`,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur MyPayGa'
    await transactionRef.update({
      paymentStatus: 'failed',
      failureReason: errorMessage,
      updatedAt: FieldValue.serverTimestamp(),
    })

    logger.error('Erreur initiation demande de recherche MyPayGa', { transactionId, error })
    res.status(502).json({
      success: false,
      error: 'provider_unavailable',
      message: `Erreur du service de paiement: ${errorMessage}`,
    })
  } finally {
    clearTimeout(timeout)
  }
})

function safeJsonParse(raw: string): Record<string, any> | null {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
