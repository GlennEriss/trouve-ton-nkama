import crypto from 'crypto'

// Helpers purs partagés entre les webhooks MyPayGa (crédits et cadeaux).
// Extraits de webhook.ts pour que giftPaymentCallback réutilise exactement la
// même vérification de signature et le même parsing défensif du payload.

export type CallbackPayload = {
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

export function buildCallbackPayload(req: any): CallbackPayload {
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

export function parseHttpPayloadObject(body: unknown, rawBody?: Buffer): Record<string, any> {
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

export function computeCallbackHash(payload: CallbackPayload, secret: string): string {
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

export function timingSafeEqual(expected: string, received: string): boolean {
  // Normaliser (trim + minuscules) : le hash hex de Node est en minuscules,
  // mais MyPayGa peut renvoyer le sien en majuscules.
  const left = String(expected).trim().toLowerCase()
  const right = String(received).trim().toLowerCase()
  if (!left || !right || left.length !== right.length) {
    return false
  }
  return crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right))
}

export function isSuccessCallback(payload: CallbackPayload): boolean {
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

function pick(source: Record<string, any>, ...keys: string[]): string {
  for (const key of keys) {
    const value = source[key]
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim()
    }
  }
  return ''
}
