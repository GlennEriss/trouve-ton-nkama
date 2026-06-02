import { FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { adminDB } from '../../admin'
import { generateTransactionId } from '../airtel/config'
import { getCreditPackById } from '../airtel/database'
import { MYPAYGA_SECRETS, getMyPayGaConfig, normalizeMyPayGaNetwork, sanitizePhoneDigits } from './config'

interface InitiatePurchaseRequest {
  packId: string
  phoneNumber: string
  network?: string
}

interface InitiatePurchaseResponse {
  success: boolean
  transactionId: string
  message: string
  providerPaymentToken?: string
}

export const initiatePurchase = onCall<InitiatePurchaseRequest, Promise<InitiatePurchaseResponse>>(
  { secrets: MYPAYGA_SECRETS },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Utilisateur non authentifié')
    }

    const { packId, phoneNumber, network } = request.data
    const uid = request.auth.uid
    const safePhone = sanitizePhoneDigits(phoneNumber)
    const providerNetwork = normalizeMyPayGaNetwork(network)

    if (!packId || !safePhone) {
      throw new HttpsError('invalid-argument', 'Pack ID et numéro de téléphone requis')
    }

    const pack = await getCreditPackById(packId)
    if (!pack) {
      throw new HttpsError('not-found', `Pack de crédits introuvable: ${packId}`)
    }

    const config = getMyPayGaConfig()
    if (!config.apiKey) {
      throw new HttpsError('failed-precondition', 'MYPAYGA_API_KEY manquant')
    }
    if (!config.callbackUrl) {
      throw new HttpsError('failed-precondition', 'MYPAYGA_CALLBACK_URL manquant')
    }

    const transactionId = generateTransactionId()
    const transactionRef = adminDB.collection('credit_transactions').doc(transactionId)

    await transactionRef.set({
      id: transactionId,
      uid,
      type: 'purchase',
      packId: pack.id,
      packName: pack.name,
      credits: pack.credits,
      amount: pack.price,
      status: 'pending',
      paymentStatus: 'pending_confirmation',
      fulfillmentStatus: 'pending',
      entitlementApplyState: 'pending',
      provider: 'mypayga',
      providerName: 'MyPayGa',
      providerNetwork,
      providerCountry: config.country,
      phoneNumber: safePhone,
      description: `Achat ${pack.name}`,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    const payload = {
      urls: {
        callback_url: config.callbackUrl,
        success_url: config.successUrl,
        fail_url: config.failUrl,
      },
      apikey: config.apiKey,
      client_phone: safePhone,
      amount: String(pack.price),
      country: config.country,
      network: providerNetwork,
      type: 'mobile_money',
      unique_id: transactionId,
      firstname: 'Client',
      lastname: 'Location Maison',
      email: `payment+${transactionId.toLowerCase()}@location-maison.invalid`,
      currency: config.currency,
      description: `Recharge ${pack.credits} credits`,
    }

    logger.info('Initiation paiement MyPayGa', {
      transactionId,
      uid,
      packId: pack.id,
      amount: pack.price,
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
      const message = String(parsed.message ?? parsed.error ?? 'Paiement initié')
      const providerPaymentToken = String(parsed.payment_token ?? parsed.paymentToken ?? '').trim()

      if (!response.ok || (Number.isFinite(requestStatus) && requestStatus >= 300)) {
        await transactionRef.update({
          status: 'failed',
          paymentStatus: 'failed_provider',
          providerInitState: 'failed',
          providerInitHttpStatus: response.status,
          providerInitMessage: message,
          providerInitRawStatus: requestStatus || null,
          failureReason: message,
          updatedAt: FieldValue.serverTimestamp(),
        })

        throw new HttpsError('aborted', `MyPayGa a refusé le paiement: ${message}`)
      }

      await transactionRef.update({
        providerInitState: 'sent',
        providerInitHttpStatus: response.status,
        providerInitMessage: message,
        providerInitRequestStatus: requestStatus || null,
        providerPaymentToken: providerPaymentToken || null,
        updatedAt: FieldValue.serverTimestamp(),
      })

      return {
        success: true,
        transactionId,
        providerPaymentToken: providerPaymentToken || undefined,
        message: `Paiement de ${pack.price} FCFA initié. Confirmez la transaction sur votre téléphone.`,
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      const message = error instanceof Error ? error.message : 'Erreur MyPayGa'
      await transactionRef.update({
        status: 'failed',
        paymentStatus: 'failed_provider',
        providerInitState: 'failed',
        providerInitMessage: message,
        failureReason: message,
        updatedAt: FieldValue.serverTimestamp(),
      })

      logger.error('Erreur initiation MyPayGa', { transactionId, error })
      throw new HttpsError('unavailable', `Erreur du service de paiement: ${message}`)
    } finally {
      clearTimeout(timeout)
    }
  },
)

function safeJsonParse(raw: string): Record<string, any> | null {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
