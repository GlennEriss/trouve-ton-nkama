import { FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { onRequest } from 'firebase-functions/v2/https'
import { adminDB } from '../../admin'
import type { Notification } from '../../models/notification'
import { sendUserPush } from '../../notification/push'
import { buildCallbackPayload, computeCallbackHash, isSuccessCallback, timingSafeEqual } from '../mypayga/callback-shared'
import { MYPAYGA_SECRETS, getMyPayGaConfig } from '../mypayga/config'

const GIFT_TRANSACTIONS_COLLECTION = 'gift_transactions'
const REELS_COLLECTION = 'reels'

// Webhook MyPayGa dédié aux cadeaux — même vérification HMAC + idempotence que
// mypaygaPaymentCallback (crédits), mais l'application du succès incrémente les
// compteurs du réel et le solde net de l'annonceur au lieu des crédits.
export const giftPaymentCallback = onRequest({ secrets: MYPAYGA_SECRETS }, async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' })
    return
  }

  const config = getMyPayGaConfig()
  if (!config.callbackSecret) {
    res.status(500).json({ ok: false, error: 'callback_secret_missing' })
    return
  }

  const payload = buildCallbackPayload(req)
  if (!payload.uniqueId || !payload.hash) {
    logger.warn('Callback cadeau rejeté: payload incomplet', {
      uniqueId: payload.uniqueId || null,
      hasHash: Boolean(payload.hash),
    })
    res.status(400).json({ ok: false, error: 'invalid_callback_payload' })
    return
  }

  const expectedHash = computeCallbackHash(payload, config.callbackSecret)
  if (!timingSafeEqual(expectedHash, payload.hash)) {
    logger.warn('Signature MyPayGa invalide (cadeau)', {
      transactionId: payload.uniqueId,
      expectedHashPrefix: expectedHash.slice(0, 10),
      receivedHashPrefix: payload.hash.slice(0, 10),
    })
    res.status(401).json({ ok: false, error: 'invalid_signature' })
    return
  }

  const transactionRef = adminDB.collection(GIFT_TRANSACTIONS_COLLECTION).doc(payload.uniqueId)
  const transactionSnapshot = await transactionRef.get()
  if (!transactionSnapshot.exists) {
    res.status(404).json({ ok: false, error: 'transaction_not_found' })
    return
  }

  const transaction = transactionSnapshot.data() ?? {}
  const expectedAmount = Number(transaction.amountXaf ?? 0)
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

  const appliedNow = await applyGiftOnce(payload.uniqueId, transaction)

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

  // Notification + push à l'annonceur, best-effort : un échec ici ne doit
  // jamais faire échouer le webhook. Gated sur appliedNow pour qu'un callback
  // rejoué (idempotence) ne crée pas de notification en double.
  if (appliedNow) {
    await notifyAnnouncerOfGift(transaction).catch((error) => {
      logger.error('Échec notification cadeau', { transactionId: payload.uniqueId, error })
    })
  }

  res.status(200).json({ ok: true, transactionId: payload.uniqueId, status: 'success' })
})

// Applique le cadeau exactement une fois (le webhook peut être rejoué) :
// compteurs du réel (montant BRUT, affiché publiquement) + solde net cumulé
// de l'annonceur (montant NET après commission, seul montant retirable).
// Renvoie true si l'application a eu lieu dans CET appel (false = déjà appliqué),
// pour que l'appelant ne notifie l'annonceur qu'une seule fois.
async function applyGiftOnce(transactionId: string, transaction: FirebaseFirestore.DocumentData): Promise<boolean> {
  const reelId = String(transaction.reelId ?? '').trim()
  const announcerUid = String(transaction.announcerUid ?? '').trim()
  const grossAmount = Math.max(0, Math.trunc(Number(transaction.amountXaf ?? 0)))
  const netAmount = Math.max(0, Math.trunc(Number(transaction.netAmountXaf ?? 0)))
  if (!reelId || !announcerUid || grossAmount <= 0 || netAmount <= 0) {
    throw new Error('Transaction cadeau incomplète')
  }

  return adminDB.runTransaction(async (tx) => {
    const transactionRef = adminDB.collection(GIFT_TRANSACTIONS_COLLECTION).doc(transactionId)
    const freshTransaction = await tx.get(transactionRef)
    const freshData = freshTransaction.data() ?? {}
    if (freshData.entitlementApplyState === 'applied' || freshData.fulfillmentStatus === 'applied') {
      return false
    }

    const userQuery = await tx.get(adminDB.collection('users').where('uid', '==', announcerUid).limit(1))
    if (userQuery.empty) {
      throw new Error(`Annonceur introuvable: ${announcerUid}`)
    }

    const reelRef = adminDB.collection(REELS_COLLECTION).doc(reelId)
    const reelSnapshot = await tx.get(reelRef)

    if (reelSnapshot.exists) {
      tx.update(reelRef, {
        giftCount: FieldValue.increment(1),
        giftTotalAmount: FieldValue.increment(grossAmount),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    tx.update(userQuery.docs[0].ref, {
      giftTotalReceivedXaf: FieldValue.increment(netAmount),
      giftCountReceived: FieldValue.increment(1),
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

async function notifyAnnouncerOfGift(transaction: FirebaseFirestore.DocumentData): Promise<void> {
  const announcerUid = String(transaction.announcerUid ?? '').trim()
  const netAmount = Math.max(0, Math.trunc(Number(transaction.netAmountXaf ?? 0)))
  if (!announcerUid || netAmount <= 0) {
    return
  }

  const notification: Notification = {
    type: 'GIFT',
    title: 'Cadeau reçu 🎁',
    message: `Tu as reçu un cadeau de ${netAmount.toLocaleString('fr-FR')} FCFA sur ton réel.`,
    isRead: false,
    createdFor: announcerUid,
    actionUrl: '/gifts',
    state: 'IN_PROGRESS',
    createdAt: FieldValue.serverTimestamp() as any,
  }

  await adminDB.collection('notifications').add(notification)

  try {
    await sendUserPush({
      uid: announcerUid,
      title: notification.title,
      body: notification.message,
      actionUrl: notification.actionUrl ?? '/gifts',
      data: { type: 'GIFT' },
    })
  } catch (error) {
    logger.error('Échec push cadeau', { announcerUid, error })
  }
}
