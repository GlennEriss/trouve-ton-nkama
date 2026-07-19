import { FieldValue } from 'firebase-admin/firestore'
import '../../node/slow-buffer-compat';
import { logger } from 'firebase-functions'
import { onRequest } from 'firebase-functions/v2/https'
import { adminDB } from '../../admin'
import { buildFunctionIncidentContext, safeHttpRequestContext } from '../../observability'
import { buildCallbackPayload, computeCallbackHash, isSuccessCallback, timingSafeEqual } from './callback-shared'
import { MYPAYGA_SECRETS, getMyPayGaConfig } from './config'

export const mypaygaPaymentCallback = onRequest({ secrets: MYPAYGA_SECRETS }, async (req, res) => {
  const requestContext = safeHttpRequestContext(req)
  const incidentContext = buildFunctionIncidentContext({
    category: 'payment_callback',
    operation: 'mypayga.credits.callback',
    requestId: requestContext.requestId,
  })

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' })
    return
  }

  logger.info('Callback MyPayGa received', {
    ...incidentContext,
    ...requestContext,
  })

  const config = getMyPayGaConfig()
  if (!config.callbackSecret) {
    logger.error('MyPayGa callback secret missing', {
      ...incidentContext,
      incidentCode: 'CALLBACK_SECRET_MISSING',
      retryable: false,
    })
    res.status(500).json({ ok: false, error: 'callback_secret_missing' })
    return
  }

  const payload = buildCallbackPayload(req)
  if (!payload.uniqueId || !payload.hash) {
    logger.warn('Callback rejeté: payload incomplet', {
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
    logger.warn('Signature MyPayGa invalide', {
      ...incidentContext,
      incidentCode: 'INVALID_CALLBACK_SIGNATURE',
      retryable: false,
      transactionId: payload.uniqueId,
    })
    res.status(401).json({ ok: false, error: 'invalid_signature' })
    return
  }

  const transactionRef = adminDB.collection('credit_transactions').doc(payload.uniqueId)
  const transactionSnapshot = await transactionRef.get()
  if (!transactionSnapshot.exists) {
    logger.warn('MyPayGa callback transaction not found', {
      ...incidentContext,
      incidentCode: 'TRANSACTION_NOT_FOUND',
      retryable: false,
      transactionId: payload.uniqueId,
    })
    res.status(404).json({ ok: false, error: 'transaction_not_found' })
    return
  }

  const transaction = transactionSnapshot.data() ?? {}
  const expectedAmount = Number(transaction.amount ?? 0)
  const callbackAmount = Number(payload.amount || 0)

  if (expectedAmount > 0 && callbackAmount > 0 && expectedAmount !== callbackAmount) {
    logger.error('MyPayGa callback amount mismatch', {
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
      providerCallbackAmount: callbackAmount,
      providerCallbackExpectedAmount: expectedAmount,
      updatedAt: FieldValue.serverTimestamp(),
    })
    res.status(409).json({ ok: false, error: 'amount_mismatch' })
    return
  }

  const succeeded = isSuccessCallback(payload)
  if (!succeeded) {
    logger.warn('MyPayGa payment rejected by provider', {
      ...incidentContext,
      incidentCode: 'PAYMENT_REJECTED',
      retryable: false,
      transactionId: payload.uniqueId,
      orderStatus: payload.orderStatus || null,
      statusRequest: payload.statusRequest || null,
    })
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

  const appliedNow = await applyCreditsOnce(payload.uniqueId, transaction)

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

  logger.info('MyPayGa credits callback applied', {
    ...incidentContext,
    transactionId: payload.uniqueId,
    replayed: !appliedNow,
  })
  res.status(200).json({ ok: true, transactionId: payload.uniqueId, status: 'success' })
})

async function applyCreditsOnce(
  transactionId: string,
  transaction: FirebaseFirestore.DocumentData,
): Promise<boolean> {
  const uid = String(transaction.uid ?? '').trim()
  const credits = Math.max(0, Math.trunc(Number(transaction.credits ?? 0)))
  if (!uid || credits <= 0) {
    throw new Error('Transaction de crédits incomplète')
  }

  return adminDB.runTransaction(async (tx) => {
    const transactionRef = adminDB.collection('credit_transactions').doc(transactionId)
    const freshTransaction = await tx.get(transactionRef)
    const freshData = freshTransaction.data() ?? {}
    if (freshData.entitlementApplyState === 'applied' || freshData.fulfillmentStatus === 'applied') {
      return false
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
    return true
  })
}
