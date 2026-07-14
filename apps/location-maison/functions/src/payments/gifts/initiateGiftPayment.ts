import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { onRequest } from 'firebase-functions/v2/https'
import { adminDB } from '../../admin'
import { generateTransactionId } from '../airtel/config'
import { MYPAYGA_SECRETS, getMyPayGaConfig, isPhoneValidForNetwork, normalizeMyPayGaNetwork, toLocalPhone } from '../mypayga/config'
import {
  GIFT_MAX_AMOUNT_XAF,
  GIFT_MAX_PENDING_PER_PHONE_PER_HOUR,
  GIFT_MESSAGE_MAX_LENGTH,
  GIFT_MIN_AMOUNT_XAF,
  GIFT_COMMISSION_RATE,
  computeNetAmount,
} from './constants'

const REELS_COLLECTION = 'reels'
const GIFT_TRANSACTIONS_COLLECTION = 'gift_transactions'

// Initiation d'un cadeau (don Mobile Money) sur un réel — endpoint ANONYME :
// le donateur n'a pas de compte, il fournit juste son numéro MoMo. La sécurité
// repose sur la confirmation USSD côté donateur (aucun argent ne bouge sans
// son code MoMo) + les gardes anti-spam ci-dessous. Appelé exclusivement en
// serveur-à-serveur depuis la route Next /api/gifts/initiate.
export const initiateGiftPayment = onRequest({ secrets: MYPAYGA_SECRETS }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'method_not_allowed' })
    return
  }

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
  const reelId = String(body.reelId ?? '').trim()
  const rawAmount = Number(body.amount)
  const providerNetwork = normalizeMyPayGaNetwork(body.network)
  const donorPhone = toLocalPhone(body.phoneNumber)
  const message = normalizeMessage(body.message)

  if (!reelId) {
    res.status(400).json({ success: false, error: 'reel_id_required', message: 'Réel manquant.' })
    return
  }

  if (!Number.isInteger(rawAmount) || rawAmount < GIFT_MIN_AMOUNT_XAF || rawAmount > GIFT_MAX_AMOUNT_XAF) {
    res.status(400).json({
      success: false,
      error: 'invalid_amount',
      message: `Le montant doit être un entier entre ${GIFT_MIN_AMOUNT_XAF} et ${GIFT_MAX_AMOUNT_XAF} FCFA.`,
    })
    return
  }

  if (!isPhoneValidForNetwork(donorPhone, providerNetwork)) {
    res.status(400).json({
      success: false,
      error: 'invalid_phone',
      message: 'Numéro invalide pour ce réseau (Airtel: 074/077, Moov: 062/065/066, suivis de 6 chiffres).',
    })
    return
  }

  const reelSnapshot = await adminDB.collection(REELS_COLLECTION).doc(reelId).get()
  const reel = reelSnapshot.data()
  const announcerUid = String(reel?.createdBy ?? '').trim()
  if (!reelSnapshot.exists || !reel || reel.moderationStatus !== 'APPROVED' || !announcerUid) {
    res.status(404).json({ success: false, error: 'reel_not_found', message: 'Ce réel n’est pas disponible.' })
    return
  }

  // Anti-spam : cap de transactions pending par numéro donateur sur 1 h.
  const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000)
  const pendingSnapshot = await adminDB
    .collection(GIFT_TRANSACTIONS_COLLECTION)
    .where('donorPhone', '==', donorPhone)
    .where('status', '==', 'pending')
    .where('createdAt', '>', oneHourAgo)
    .limit(GIFT_MAX_PENDING_PER_PHONE_PER_HOUR)
    .get()
  if (pendingSnapshot.size >= GIFT_MAX_PENDING_PER_PHONE_PER_HOUR) {
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
  if (!config.giftCallbackUrl) {
    res.status(500).json({ success: false, error: 'missing_gift_callback_url' })
    return
  }

  const transactionId = generateTransactionId()
  const transactionRef = adminDB.collection(GIFT_TRANSACTIONS_COLLECTION).doc(transactionId)

  await transactionRef.set({
    id: transactionId,
    type: 'gift',
    reelId,
    announcerUid,
    propertyId: reel.propertyId ?? null,
    donorPhone,
    donorNetwork: providerNetwork,
    message,
    amountXaf: rawAmount,
    commissionRate: GIFT_COMMISSION_RATE,
    netAmountXaf: computeNetAmount(rawAmount),
    status: 'pending',
    paymentStatus: 'pending_confirmation',
    fulfillmentStatus: 'pending',
    entitlementApplyState: 'pending',
    provider: 'mypayga',
    providerName: 'MyPayGa',
    providerNetwork,
    providerCountry: config.country,
    description: 'Cadeau sur un réel',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  const payload = {
    urls: {
      callback_url: config.giftCallbackUrl,
      success_url: config.successUrl,
      fail_url: config.failUrl,
    },
    apikey: config.apiKey,
    client_phone: donorPhone,
    amount: String(rawAmount),
    country: config.country,
    network: providerNetwork,
    type: 'mobile_money',
    unique_id: transactionId,
    firstname: 'Donateur',
    lastname: 'Location Maison',
    email: `gift+${transactionId.toLowerCase()}@location-maison.invalid`,
    currency: config.currency,
    description: 'Cadeau reel',
  }

  logger.info('Initiation cadeau MyPayGa', {
    transactionId,
    reelId,
    announcerUid,
    amount: rawAmount,
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
        status: 'failed',
        paymentStatus: 'failed_provider',
        providerInitState: 'failed',
        providerInitHttpStatus: response.status,
        providerInitMessage: providerMessage,
        providerInitRawStatus: requestStatus || null,
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
      providerInitState: 'sent',
      providerInitHttpStatus: response.status,
      providerInitMessage: providerMessage,
      providerInitRequestStatus: requestStatus || null,
      providerPaymentToken: providerPaymentToken || null,
      updatedAt: FieldValue.serverTimestamp(),
    })

    res.status(200).json({
      success: true,
      transactionId,
      message: `Paiement de ${rawAmount} FCFA initié. Confirme la transaction sur ton téléphone.`,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur MyPayGa'
    await transactionRef.update({
      status: 'failed',
      paymentStatus: 'failed_provider',
      providerInitState: 'failed',
      providerInitMessage: errorMessage,
      failureReason: errorMessage,
      updatedAt: FieldValue.serverTimestamp(),
    })

    logger.error('Erreur initiation cadeau MyPayGa', { transactionId, error })
    res.status(502).json({
      success: false,
      error: 'provider_unavailable',
      message: `Erreur du service de paiement: ${errorMessage}`,
    })
  } finally {
    clearTimeout(timeout)
  }
})

function normalizeMessage(value: unknown): string | null {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) {
    return null
  }
  return trimmed.slice(0, GIFT_MESSAGE_MAX_LENGTH)
}

function safeJsonParse(raw: string): Record<string, any> | null {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
