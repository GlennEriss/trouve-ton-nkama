/**
 * Module pour les appels à l'API Airtel Money
 */

import { logger } from 'firebase-functions'
import { getAirtelCredentials, AIRTEL_CONFIG } from './config'
import { AirtelPaymentRequest, AirtelPaymentResponse } from './types'

interface AirtelTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

/**
 * Obtient un token d'accès OAuth2 depuis Airtel Money
 */
async function getAccessToken(): Promise<string> {
  const credentials = getAirtelCredentials()
  const tokenUrl = `${credentials.baseUrl}${AIRTEL_CONFIG.ENDPOINTS.TOKEN}`

  logger.info('Demande de token OAuth2 Airtel Money', { 
    url: tokenUrl,
    clientId: credentials.clientId 
  })

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        grant_type: 'client_credentials'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Erreur token OAuth2', { 
        status: response.status, 
        error: errorText 
      })
      throw new Error(`Erreur OAuth2: ${response.status} - ${errorText}`)
    }

    const tokenData: AirtelTokenResponse = await response.json()
    logger.info('Token OAuth2 obtenu avec succès')
    
    return tokenData.access_token

  } catch (error) {
    logger.error('Erreur lors de l\'obtention du token', error)
    throw error
  }
}

/**
 * Initie un paiement via l'API Airtel Money
 */
export async function initiateAirtelPayment(
  transactionId: string,
  phoneNumber: string,
  amount: number
): Promise<AirtelPaymentResponse> {
  const credentials = getAirtelCredentials()
  const accessToken = await getAccessToken()
  
  const paymentUrl = `${credentials.baseUrl}${AIRTEL_CONFIG.ENDPOINTS.INITIATE_PAYMENT}`
  
  const paymentRequest: AirtelPaymentRequest = {
    reference: transactionId,
    subscriber_msisdn: phoneNumber,
    amount: amount,
    country: AIRTEL_CONFIG.COUNTRY,
    currency: AIRTEL_CONFIG.CURRENCY,
    transaction: {
      amount: amount,
      country: AIRTEL_CONFIG.COUNTRY,
      currency: AIRTEL_CONFIG.CURRENCY,
      id: transactionId
    }
  }

  logger.info('Initiation paiement Airtel Money', {
    transactionId,
    phoneNumber: phoneNumber.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1**$3$4'), // Masquer une partie du numéro
    amount,
    url: paymentUrl
  })

  try {
    const response = await fetch(paymentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Country': AIRTEL_CONFIG.COUNTRY,
        'X-Currency': AIRTEL_CONFIG.CURRENCY
      },
      body: JSON.stringify(paymentRequest)
    })

    const responseData = await response.json()

    if (!response.ok) {
      logger.error('Erreur API Airtel Money', {
        status: response.status,
        transactionId,
        error: responseData
      })
      throw new Error(`Erreur Airtel Money: ${response.status} - ${JSON.stringify(responseData)}`)
    }

    logger.info('Paiement Airtel Money initié avec succès', {
      transactionId,
      airtelResponse: responseData
    })

    return responseData as AirtelPaymentResponse

  } catch (error) {
    logger.error('Erreur lors de l\'initiation du paiement', {
      transactionId,
      error
    })
    throw error
  }
}

/**
 * Vérifie le statut d'un paiement Airtel Money
 */
export async function checkPaymentStatus(transactionId: string): Promise<AirtelPaymentResponse> {
  const credentials = getAirtelCredentials()
  const accessToken = await getAccessToken()
  
  const statusUrl = `${credentials.baseUrl}${AIRTEL_CONFIG.ENDPOINTS.PAYMENT_STATUS}${transactionId}`

  logger.info('Vérification statut paiement', { transactionId, url: statusUrl })

  try {
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Country': AIRTEL_CONFIG.COUNTRY,
        'X-Currency': AIRTEL_CONFIG.CURRENCY
      }
    })

    const responseData = await response.json()

    if (!response.ok) {
      logger.error('Erreur vérification statut', {
        status: response.status,
        transactionId,
        error: responseData
      })
      throw new Error(`Erreur statut: ${response.status} - ${JSON.stringify(responseData)}`)
    }

    logger.info('Statut paiement récupéré', {
      transactionId,
      status: responseData.data?.transaction?.status
    })

    return responseData as AirtelPaymentResponse

  } catch (error) {
    logger.error('Erreur lors de la vérification du statut', {
      transactionId,
      error
    })
    throw error
  }
} 