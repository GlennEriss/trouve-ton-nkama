/**
 * Modal pour l'achat de packs de crédits
 */

'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useQueryClient } from '@tanstack/react-query'
import { X, Package, Loader2, AlertCircle, Smartphone } from 'lucide-react'
import { PAYMENT_METHODS, isPhoneValidForNetwork, detectNetworkFromPhone } from '@/constantes/payment-methods'
import PaymentStatusModal from './PaymentStatusModal'
import { useCreditsPurchase } from '@/hooks/use-credits-purchase'
import { useTransactionStatus } from '@/hooks/use-transaction-status'
import { useToast } from '@/hooks/use-toast'
import { createLogger } from '@/lib/logger'
import { useCreditPacks } from '@/hooks/use-credit-packs'
import {
  toUiCreditPack,
  type CreditPackUi,
} from '@/lib/credits/credit-packs'

const logger = createLogger('components.purchase-modal')

interface PurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedPack?: CreditPackUi | null
}

export default function PurchaseModal({ isOpen, onClose, preselectedPack }: Readonly<PurchaseModalProps>) {
  const [selectedPack, setSelectedPack] = useState<CreditPackUi | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [network, setNetwork] = useState<'AM' | 'MM'>('AM')
  const [step, setStep] = useState<'select' | 'payment'>('select')
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const creditPacksQuery = useCreditPacks()
  const queryClient = useQueryClient()
  const { status: txStatus, failureReason } = useTransactionStatus(transactionId)
  const creditPacks = React.useMemo(() => {
    const source = creditPacksQuery.data?.packs ?? []
    return source.map(toUiCreditPack)
  }, [creditPacksQuery.data?.packs])
  
  const { mutate: purchaseCredits, isPending, isError, error } = useCreditsPurchase()
  const { toast } = useToast()

  // Effet pour initialiser le modal avec le pack présélectionné
  useEffect(() => {
    initializeWithPreselectedPack()
  }, [preselectedPack])

  // Quand le callback MyPayGa confirme le paiement, rafraîchir solde et historique
  useEffect(() => {
    if (txStatus === 'success') {
      queryClient.invalidateQueries({ queryKey: ['credits-balance'] })
      queryClient.invalidateQueries({ queryKey: ['credits-history'] })
      queryClient.invalidateQueries({ queryKey: ['credit-history'] })
    }
  }, [txStatus, queryClient])

  // Méthode pour initialiser le modal avec le pack présélectionné
  const initializeWithPreselectedPack = () => {
    if (preselectedPack) {
      setSelectedPack(preselectedPack)
      setStep('payment')
    } else {
      // Réinitialiser si pas de pack présélectionné
      setSelectedPack(null)
      if (step !== 'select') {
        setStep('select')
      }
    }
  }

  const handlePackSelect = (pack: CreditPackUi) => {
    setSelectedPack(pack)
    setStep('payment')
  }

  // Le numéro saisi est-il valide pour le réseau sélectionné ?
  const isPhoneValid = isPhoneValidForNetwork(phoneNumber, network)

  // Met à jour le numéro et bascule automatiquement le réseau si le préfixe
  // correspond clairement à l'autre opérateur (074/076/077 = Airtel, 062/065/066 = Moov).
  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value)
    const detected = detectNetworkFromPhone(value)
    if (detected && detected !== network) {
      setNetwork(detected)
    }
  }

  const handlePurchase = () => {
    if (selectedPack && isPhoneValid) {
      purchaseCredits({
        packId: selectedPack.id,
        phoneNumber: phoneNumber.trim(),
        network,
      }, {
        onSuccess: (response) => {
          logger.info('Paiement MyPayGa initié', { response })

          // Mémoriser l'ID de transaction pour écouter son statut en temps réel
          setTransactionId(response.transactionId ?? null)

          toast({
            title: "Paiement initié",
            description: "Confirmez la transaction sur votre téléphone. Les crédits seront ajoutés après confirmation.",
          })
        },
        onError: (error) => {
          logger.error('Erreur initiation paiement MyPayGa', { error })
          
          toast({
            title: "Erreur de paiement",
            description: error.message ?? 'Une erreur est survenue lors de l’initiation du paiement',
            variant: "destructive"
          })
        }
      })
    }
  }

  const resetModal = () => {
    setSelectedPack(null)
    setPhoneNumber('')
    setNetwork('AM')
    setStep('select')
    setTransactionId(null)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const handleKeyDown = (event: React.KeyboardEvent, pack: CreditPackUi) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handlePackSelect(pack)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Recharger mes crédits
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Étape 1: Sélection du pack */}
          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-center">
                Choisissez votre pack de crédits
              </p>
              
              <div className="space-y-3">
                {creditPacks.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => handlePackSelect(pack)}
                    onKeyDown={(e) => handleKeyDown(e, pack)}
                    className="w-full text-left border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200"
                    aria-label={`Sélectionner le pack ${pack.name} - ${pack.credits} crédits pour ${pack.price} FCFA`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-primary" />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {pack.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {pack.credits} crédits
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-primary dark:text-secondary">
                          {pack.price.toLocaleString()} FCFA
                        </p>
                        {pack.savings && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Économisez {pack.savings}%
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {!creditPacksQuery.isFetching && creditPacks.length === 0 ? (
                <p className="text-sm text-amber-700 dark:text-amber-300 text-center">
                  Aucun pack actif n&apos;est configuré côté admin.
                </p>
              ) : null}
            </div>
          )}

          {/* Étape 2: Paiement MyPayGa */}
          {step === 'payment' && selectedPack && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Paiement mobile money
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Pack {selectedPack.name} - {selectedPack.price.toLocaleString()} FCFA
                </p>
              </div>

              {/* Moyens de paiement acceptés */}
              <div className="flex flex-row items-center justify-center gap-6">
                {PAYMENT_METHODS.map((method) => (
                  <div key={method.id} className="relative w-32 h-20 flex-shrink-0">
                    <Image
                      src={`/assets/balance/${method.icon}`}
                      alt={method.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <label htmlFor="payment-network" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Réseau
                </label>
                <select
                  id="payment-network"
                  value={network}
                  onChange={(event) => setNetwork(event.target.value as 'AM' | 'MM')}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="AM">Airtel Money</option>
                  <option value="MM">Moov Money</option>
                </select>

                <label htmlFor="payment-phone-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Numéro de téléphone
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="payment-phone-input"
                    type="tel"
                    value={phoneNumber}
                    onChange={(event) => handlePhoneChange(event.target.value)}
                    placeholder="Ex: 077123456"
                    className={`w-full px-4 py-3 pl-11 border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      phoneNumber.trim() && !isPhoneValid
                        ? 'border-red-400 dark:border-red-500'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  />
                </div>
                {phoneNumber.trim() && !isPhoneValid ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Numéro invalide. Airtel Money : 074/076/077 — Moov Money : 062/065/066, suivis de 6 chiffres.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Une demande de confirmation sera envoyée sur ce numéro.
                  </p>
                )}
              </div>

              {/* Initiation en cours (appel à la Cloud Function) */}
              {isPending && (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Initiation du paiement...</span>
                </div>
              )}


              {/* Erreur lors de l'initiation */}
              {isError && !transactionId && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error?.message ?? 'Erreur lors de l’initiation du paiement'}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => preselectedPack ? handleClose() : setStep('select')}
                  disabled={isPending || Boolean(transactionId)}
                  className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {preselectedPack ? 'Annuler' : 'Retour'}
                </button>
                <button
                  onClick={handlePurchase}
                  disabled={Boolean(isPending) || !isPhoneValid || Boolean(transactionId)}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-800 disabled:opacity-50 transition-colors"
                >
                  Payer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modale de statut : attente → succès / échec (piloté par le listener Firestore) */}
      <PaymentStatusModal
        isOpen={Boolean(transactionId)}
        status={
          txStatus === 'success'
            ? 'success'
            : (txStatus === 'failed' || txStatus === 'cancelled')
              ? 'failed'
              : 'pending'
        }
        phoneNumber={phoneNumber.trim() || undefined}
        message={
          (txStatus === 'failed' || txStatus === 'cancelled')
            ? (failureReason ?? undefined)
            : undefined
        }
        actionLabel={txStatus === 'success' ? 'Terminer' : 'Réessayer'}
        onAction={() => {
          if (txStatus === 'success') {
            handleClose()
          } else {
            // Échec : permettre de réessayer en repartant du formulaire
            setTransactionId(null)
          }
        }}
        onClose={handleClose}
      />
    </div>
  )
}
