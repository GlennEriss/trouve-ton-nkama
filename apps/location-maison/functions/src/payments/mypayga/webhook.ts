import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { onRequest } from 'firebase-functions/v2/https'
import { adminDB } from '../../admin'
import { MYPAYGA_SECRETS, getMyPayGaConfig } from './config'

type CallbackPayload = {
  uniqueId: string
  hash: string
  amount: string
  orderStatus: string
  statusRequest: string
  paymentToken: string
  paymentMethod: string
  message: string
  clientPhone: string
  currency: string
}

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

function buildCallbackPayload(req: any): CallbackPayload {
  // MyPayGa peut envoyer le corps en JSON, en form-urlencoded ou en query.
  // On parse le corps de façon robuste avant d'extraire les champs.
  const body = parseHttpPayloadObject(req?.body, req?.rawBody)
  const query = req?.query && typeof req.query === 'object' ? req.query : {}
  const source = { ...query, ...body }

  return {
    uniqueId: pick(source, 'unique_id', 'uniqueId', 'paymentId'),
    hash: pick(source, 'hash', 'callback_signature', 'callbackSignature', 'signature'),
    amount: pick(source, 'amount'),
    orderStatus: pick(source, 'order_status', 'orderStatus'),
    statusRequest: pick(source, 'status_request', 'statusRequest', 'request_status'),
    paymentToken: pick(source, 'payment_token', 'paymentToken'),
    paymentMethod: pick(source, 'payment_method', 'paymentMethod'),
    message: pick(source, 'message'),
    clientPhone: pick(source, 'client_phone', 'clientPhone', 'phone'),
    currency: pick(source, 'currency'),
  }
}

function parseHttpPayloadObject(body: unknown, rawBody?: Buffer): Record<string, any> {
  // Corps déjà parsé en objet par Firebase (JSON / urlencoded reconnus)
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    return body as Record<string, any>
  }

  // Sinon, repartir du corps brut (string ou Buffer)
  let raw = ''
  if (typeof body === 'string') {
    raw = body
  } else if (Buffer.isBuffer(body)) {
    raw = body.toString('utf8')
  } else if (rawBody && Buffer.isBuffer(rawBody)) {
    raw = rawBody.toString('utf8')
  }

  raw = raw.trim()
  if (!raw) {
    return {}
  }

  // 1) Tenter JSON
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, any>
    }
  } catch {
    // pas du JSON, on tente le form-urlencoded
  }

  // 2) Tenter form-urlencoded (a=b&c=d)
  const params = new URLSearchParams(raw)
  const result: Record<string, any> = {}
  for (const [key, value] of params.entries()) {
    if (key) {
      result[key] = value
    }
  }
  return result
}

function computeCallbackHash(payload: CallbackPayload, secret: string): string {
  const input = [
    payload.orderStatus,
    payload.uniqueId,
    payload.amount,
    payload.paymentToken,
    payload.paymentMethod,
    payload.message,
    payload.clientPhone,
  ].join('')

  return crypto.createHmac('sha512', secret).update(input).digest('hex')
}

function timingSafeEqual(expected: string, received: string): boolean {
  // Normaliser (trim + minuscules) : le hash hex de Node est en minuscules,
  // mais MyPayGa peut renvoyer le sien en majuscules.
  const left = String(expected).trim().toLowerCase()
  const right = String(received).trim().toLowerCase()
  if (!left || !right || left.length !== right.length) {
    return false
  }
  return crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right))
}

function isSuccessCallback(payload: CallbackPayload): boolean {
  // Code de statut explicite (200 = succès)
  const orderStatus = String(payload.orderStatus ?? '').trim().toLowerCase()
  const statusRequest = String(payload.statusRequest ?? '').trim()
  if (
    orderStatus === '200'
    || orderStatus === 'success'
    || orderStatus === 'successful'
    || orderStatus === 'paid'
    || orderStatus === 'confirmed'
    || orderStatus === 'complete'
    || orderStatus === 'completed'
    || statusRequest === '200'
  ) {
    return true
  }

  // Repli sur le message texte
  const text = `${payload.orderStatus} ${payload.statusRequest} ${payload.message}`.toLowerCase()
  return text.includes('success') || text.includes('successful') || text.includes('paid') || text.includes('succès')
}

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

function pick(source: Record<string, any>, ...keys: string[]): string {
  for (const key of keys) {
    const value = source[key]
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim()
    }
  }
  return ''
}
