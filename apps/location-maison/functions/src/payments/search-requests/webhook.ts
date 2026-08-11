import { FieldValue } from 'firebase-admin/firestore'
import '../../node/slow-buffer-compat';
import { logger } from 'firebase-functions'
import { onRequest } from 'firebase-functions/v2/https'
import { adminDB } from '../../admin'
import { buildFunctionIncidentContext, safeHttpRequestContext } from '../../observability'
import { buildCallbackPayload, computeCallbackHash, isSuccessCallback, timingSafeEqual } from '../mypayga/callback-shared'
import { MYPAYGA_SECRETS, getMyPayGaConfig } from '../mypayga/config'

const SEARCH_REQUESTS_COLLECTION = 'search_requests'

// Webhook MyPayGa dédié aux demandes de recherche — même vérification HMAC +
// idempotence que giftPaymentCallback, mais contrairement aux cadeaux le succès
// n'incrémente aucun compteur : il fait juste entrer la demande en modération
// admin (moderationStatus: null -> 'PENDING'). La fenêtre de boost, elle,
// n'est JAMAIS écrite ici — voir search-requests-moderation.service.ts côté
// admin, qui l'active uniquement à l'approbation.
export const searchRequestPaymentCallback = onRequest({ secrets: MYPAYGA_SECRETS }, async (req, res) => {
  const requestContext = safeHttpRequestContext(req)
  const incidentContext = buildFunctionIncidentContext({
    category: 'payment_callback',
    operation: 'mypayga.search_request.callback',
    requestId: requestContext.requestId,
  })

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' })
    return
  }

  const config = getMyPayGaConfig()
  if (!config.callbackSecret) {
    logger.error('Search request callback secret missing', {
      ...incidentContext,
      incidentCode: 'CALLBACK_SECRET_MISSING',
      retryable: false,
    })
    res.status(500).json({ ok: false, error: 'callback_secret_missing' })
    return
  }

  const payload = buildCallbackPayload(req)
  if (!payload.uniqueId || !payload.hash) {
    logger.warn('Callback demande de recherche rejeté: payload incomplet', {
      ...incidentContext,
      incidentCode: 'INVALID_CALLBACK_PAYLOAD',
      retryable: false,
      uniqueId: payload.uniqueId || null,
      hasHash: Boolean(payload.hash),
    })
    res.status(400).json({ ok: false, error: 'invalid_callback_payload' })
    return
  }

  const expectedHash = computeCallbackHash(payload, config.callbackSecret)
  if (!timingSafeEqual(expectedHash, payload.hash)) {
    logger.warn('Signature MyPayGa invalide (demande de recherche)', {
      ...incidentContext,
      incidentCode: 'INVALID_CALLBACK_SIGNATURE',
      retryable: false,
      transactionId: payload.uniqueId,
    })
    res.status(401).json({ ok: false, error: 'invalid_signature' })
    return
  }

  const transactionRef = adminDB.collection(SEARCH_REQUESTS_COLLECTION).doc(payload.uniqueId)
  const transactionSnapshot = await transactionRef.get()
  if (!transactionSnapshot.exists) {
    logger.warn('Search request callback transaction not found', {
      ...incidentContext,
      incidentCode: 'TRANSACTION_NOT_FOUND',
      retryable: false,
      transactionId: payload.uniqueId,
    })
    res.status(404).json({ ok: false, error: 'transaction_not_found' })
    return
  }

  const transaction = transactionSnapshot.data() ?? {}
  const expectedAmount = Number(transaction.amountPaidXaf ?? 0)
  const callbackAmount = Number(payload.amount || 0)

  if (expectedAmount > 0 && callbackAmount > 0 && expectedAmount !== callbackAmount) {
    logger.error('Search request callback amount mismatch', {
      ...incidentContext,
      incidentCode: 'AMOUNT_MISMATCH',
      retryable: false,
      transactionId: payload.uniqueId,
      expectedAmount,
      callbackAmount,
    })
    await transactionRef.update({
      providerCallbackVerified: false,
      providerCallbackError: 'amount_mismatch',
      updatedAt: FieldValue.serverTimestamp(),
    })
    res.status(409).json({ ok: false, error: 'amount_mismatch' })
    return
  }

  const succeeded = isSuccessCallback(payload)
  if (!succeeded) {
    logger.warn('Search request payment rejected by provider', {
      ...incidentContext,
      incidentCode: 'PAYMENT_REJECTED',
      retryable: false,
      transactionId: payload.uniqueId,
      orderStatus: payload.orderStatus || null,
      statusRequest: payload.statusRequest || null,
    })
    await transactionRef.update({
      paymentStatus: 'failed',
      failureReason: payload.message || 'Paiement refusé par MyPayGa',
      providerCallbackVerified: true,
      updatedAt: FieldValue.serverTimestamp(),
    })
    res.status(200).json({ ok: true, transactionId: payload.uniqueId, status: 'failed' })
    return
  }

  const appliedNow = await applySearchRequestPaymentOnce(payload.uniqueId)

  logger.info('MyPayGa search request callback applied', {
    ...incidentContext,
    transactionId: payload.uniqueId,
    replayed: !appliedNow,
  })
  res.status(200).json({ ok: true, transactionId: payload.uniqueId, status: 'success' })
})

// Applique le paiement exactement une fois (le webhook peut être rejoué) :
// paymentStatus -> 'confirmed', boostPaid selon boostRequested, et
// moderationStatus -> 'PENDING' (entrée en file de modération admin). Renvoie
// false si déjà appliqué (replay) pour ne rien réécrire par-dessus une
// décision de modération déjà prise entre-temps.
async function applySearchRequestPaymentOnce(transactionId: string): Promise<boolean> {
  return adminDB.runTransaction(async (tx) => {
    const transactionRef = adminDB.collection(SEARCH_REQUESTS_COLLECTION).doc(transactionId)
    const freshSnapshot = await tx.get(transactionRef)
    const freshData = freshSnapshot.data() ?? {}
    if (freshData.paymentStatus === 'confirmed') {
      return false
    }

    const boostRequested = Boolean(freshData.boostRequested)
    tx.update(transactionRef, {
      paymentStatus: 'confirmed',
      boostPaid: boostRequested,
      moderationStatus: 'PENDING',
      paymentConfirmedVia: 'provider_callback',
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return true
  })
}
