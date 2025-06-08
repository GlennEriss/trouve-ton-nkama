/**
 * Cloud Function pour initier un achat de crédits via Airtel Money
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { createCreditTransaction, getCreditPackById, addCreditsToUser } from './database'
import { validateAirtelNumber, formatPhoneNumber } from './config'
import { initiateAirtelPayment } from './airtelApi'
import { logger } from 'firebase-functions'

interface InitiatePurchaseRequest {
  packId: string
  phoneNumber: string
}

interface InitiatePurchaseResponse {
  success: boolean
  transactionId: string
  checkoutUrl?: string
  message: string
  airtelTransactionId?: string
}

export const initiatePurchase = onCall<InitiatePurchaseRequest, Promise<InitiatePurchaseResponse>>(
  async (request) => {
    try {
      // Vérification de l'authentification
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Utilisateur non authentifié')
      }

      const { packId, phoneNumber } = request.data
      const userId = request.auth.uid

      // Validation des paramètres
      if (!packId || !phoneNumber) {
        throw new HttpsError(
          'invalid-argument',
          'Pack ID et numéro de téléphone requis'
        )
      }

      // Vérifier que le pack existe
      const pack = getCreditPackById(packId)
      if (!pack) {
        throw new HttpsError('not-found', `Pack de crédits introuvable: ${packId}`)
      }

      // Valider le numéro de téléphone Airtel
      if (!validateAirtelNumber(phoneNumber)) {
        throw new HttpsError(
          'invalid-argument',
          'Numéro de téléphone Airtel invalide. Format requis: +241 XX XX XX XX'
        )
      }

      const formattedPhone = formatPhoneNumber(phoneNumber)

      logger.info('Initiation achat de crédits', {
        userId,
        packId,
        phoneNumber: formattedPhone,
        amount: pack.price,
        credits: pack.credits
      })

      // Créer la transaction en base
      const transaction = await createCreditTransaction(
        userId,
        packId,
        formattedPhone
      )

      // Déterminer le mode (simulation ou vrai paiement)
      const isSimulationMode = process.env.AIRTEL_SIMULATION_MODE === 'true'

      if (isSimulationMode) {
        // PHASE 1: Mode simulation - Ajouter immédiatement les crédits
        logger.info('Mode simulation: Ajout des crédits au solde utilisateur', {
          userId,
          credits: pack.credits,
          transactionId: transaction.id
        })

        await addCreditsToUser(userId, pack.credits, transaction.id)

        const checkoutUrl = `https://sandbox.airtel.africa/checkout/${transaction.id}`

        return {
          success: true,
          transactionId: transaction.id,
          checkoutUrl,
          message: `Simulation: Achat de ${pack.credits} crédits pour ${pack.price} FCFA réussi !`
        }

      } else {
        // PHASE 2: Vrai paiement Airtel Money
        logger.info('Mode production: Initiation paiement Airtel Money', {
          transactionId: transaction.id,
          amount: pack.price
        })

        try {
          const airtelResponse = await initiateAirtelPayment(
            transaction.id,
            formattedPhone,
            pack.price
          )

          // Vérifier le succès de la réponse Airtel
          if (!airtelResponse.status.success) {
            throw new HttpsError(
              'aborted',
              `Erreur Airtel Money: ${airtelResponse.status.message}`
            )
          }

          const airtelTransactionId = airtelResponse.data?.transaction?.airtel_money_id

          logger.info('Paiement Airtel Money initié avec succès', {
            transactionId: transaction.id,
            airtelTransactionId,
            status: airtelResponse.data?.transaction?.status
          })

          return {
            success: true,
            transactionId: transaction.id,
            airtelTransactionId,
            message: `Paiement de ${pack.price} FCFA initié. Suivez les instructions sur votre téléphone.`
          }

        } catch (airtelError: any) {
          logger.error('Erreur lors de l\'appel Airtel Money', {
            transactionId: transaction.id,
            error: airtelError
          })

          throw new HttpsError(
            'unavailable',
            `Erreur du service de paiement: ${airtelError.message}`
          )
        }
      }

    } catch (error) {
      logger.error('Erreur lors de l\'initiation d\'achat', error)

      if (error instanceof HttpsError) {
        throw error
      }

      throw new HttpsError(
        'internal',
        'Erreur interne lors de l\'initiation du paiement'
      )
    }
  }
) 