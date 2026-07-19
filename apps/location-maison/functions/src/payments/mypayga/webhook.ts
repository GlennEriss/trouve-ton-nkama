import { FieldValue } from 'firebase-admin/firestore'
import '../../node/slow-buffer-compat';
import { logger } from 'firebase-functions'
import { onRequest } from 'firebase-functions/v2/https'
import { adminDB } from '../../admin'
import { buildCallbackPayload, computeCallbackHash, isSuccessCallback, timingSafeEqual } from './callback-shared'
import { MYPAYGA_SECRETS, getMyPayGaConfig } from './config'

export const mypaygaPaymentCallback = onRequest({ secrets: MYPAYGA_SECRETS }, async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' })
    return
  }

  // Diagnostic temporaire : tracer la structure brute envoyée par MyPayGa
  // pour caler le mapping des champs (à retirer une fois le format confirmé).
  logger.info('Callback MyPayGa reçu (diagnostic)', {
    method: req.method,
    contentType: req.headers['content-type'] ?? null,
    query: req.query ?? null,
    body: req.body ?? null,
    rawBody: req.rawBody ? req.rawBody.toString('utf8').slice(0, 1000) : null,
  })

  const config = getMyPayGaConfig()
  if (!config.callbackSecret) {
    res.status(500).json({ ok: false, error: 'callback_secret_missing' })
    return
  }

  const payload = buildCallbackPayload(req)
  if (!payload.uniqueId || !payload.hash) {
    logger.warn('Callback rejeté: payload incomplet', {
      uniqueId: payload.uniqueId || null,
      hasHash: Boolean(payload.hash),
    })
    res.status(400).json({ ok: false, error: 'invalid_callback_payload' })
    return
  }

  const expectedHash = computeCallbackHash(payload, config.callbackSecret)
  if (!timingSafeEqual(expectedHash, payload.hash)) {
    logger.warn('Signature MyPayGa invalide', {
      transactionId: payload.uniqueId,
      expectedHashPrefix: expectedHash.slice(0, 10),
      receivedHashPrefix: payload.hash.slice(0, 10),
    })
    res.status(401).json({ ok: false, error: 'invalid_signature' })
    return
  }

  const transactionRef = adminDB.collection('credit_transactions').doc(payload.uniqueId)
  const transactionSnapshot = await transactionRef.get()
  if (!transactionSnapshot.exists) {
    res.status(404).json({ ok: false, error: 'transaction_not_found' })
    return
  }

  const transaction = transactionSnapshot.data() ?? {}
  const expectedAmount = Number(transaction.amount ?? 0)
  const callbackAmount = Number(payload.amount || 0)

  if (expectedAmount > 0 && callbackAmount > 0 && expectedAmount !== callbackAmount) {
    await transactionRef.update({
      providerCallbackVerified: false,
      providerCallbackError: 'amount_mismatch',
      providerCallbackAmount: callbackAmount,
      providerCallbackExpectedAmount: expectedAmount,
      updatedAt: FieldValue.serverTimestamp(),
    })
    res.status(409).json({ ok: false, error: 'amount_mismatch' })
    return
  }

  const succeeded = isSuccessCallback(payload)
  if (!succeeded) {
    await transactionRef.update({
      status: 'failed',
      paymentStatus: 'failed_provider',
      providerCallbackVerified: true,
      providerCallbackResult: 'failed',
      providerOrderStatus: payload.orderStatus || null,
      providerStatusRequest: payload.statusRequest || null,
      providerMessage: payload.message || null,
      failureReason: payload.message || 'Paiement refusé par MyPayGa',
      updatedAt: FieldValue.serverTimestamp(),
    })
    res.status(200).json({ ok: true, transactionId: payload.uniqueId, status: 'failed' })
    return
  }

  await applyCreditsOnce(payload.uniqueId, transaction)

  await transactionRef.update({
    status: 'success',
    paymentStatus: 'confirmed',
    fulfillmentStatus: 'applied',
    entitlementApplyState: 'applied',
    providerCallbackVerified: true,
    providerCallbackResult: 'success',
    providerOrderStatus: payload.orderStatus || null,
    providerStatusRequest: payload.statusRequest || null,
    providerMessage: payload.message || null,
    providerPaymentToken: payload.paymentToken || transaction.providerPaymentToken || null,
    providerMethodLabel: payload.paymentMethod || null,
    providerCallbackPhone: payload.clientPhone || null,
    providerAmountCfa: callbackAmount || expectedAmount || null,
    providerCurrency: payload.currency || null,
    paymentConfirmedVia: 'provider_callback',
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  res.status(200).json({ ok: true, transactionId: payload.uniqueId, status: 'success' })
})

async function applyCreditsOnce(transactionId: string, transaction: FirebaseFirestore.DocumentData): Promise<void> {
  const uid = String(transaction.uid ?? '').trim()
  const credits = Math.max(0, Math.trunc(Number(transaction.credits ?? 0)))
  if (!uid || credits <= 0) {
    throw new Error('Transaction de crédits incomplète')
  }

  await adminDB.runTransaction(async (tx) => {
    const transactionRef = adminDB.collection('credit_transactions').doc(transactionId)
    const freshTransaction = await tx.get(transactionRef)
    const freshData = freshTransaction.data() ?? {}
    if (freshData.entitlementApplyState === 'applied' || freshData.fulfillmentStatus === 'applied') {
      return
    }

    const userQuery = await tx.get(adminDB.collection('users').where('uid', '==', uid).limit(1))
    if (userQuery.empty) {
      throw new Error(`Utilisateur introuvable: ${uid}`)
    }

    const userRef = userQuery.docs[0].ref
    tx.update(userRef, {
      credits: FieldValue.increment(credits),
      updatedAt: FieldValue.serverTimestamp(),
    })
    tx.update(transactionRef, {
      fulfillmentStatus: 'applied',
      entitlementApplyState: 'applied',
      entitlementApplied: true,
      entitlementAppliedAt: FieldValue.serverTimestamp(),
    })
  })
}
