/**
 * Modal pour l'achat de packs de crédits
 */

'use client'

import React, { useState, useEffect } from 'react'
import { X, Package, Loader2, CheckCircle, AlertCircle, Smartphone } from 'lucide-react'
import { useCreditsPurchase } from '@/hooks/use-credits-purchase'
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
  const creditPacksQuery = useCreditPacks()
  const creditPacks = React.useMemo(() => {
    const source = creditPacksQuery.data?.packs ?? []
    return source.map(toUiCreditPack)
  }, [creditPacksQuery.data?.packs])
  
  const { mutate: purchaseCredits, isPending, isSuccess, isError, error } = useCreditsPurchase()
  const { toast } = useToast()

  // Effet pour initialiser le modal avec le pack présélectionné
  useEffect(() => {
    initializeWithPreselectedPack()
  }, [preselectedPack])

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

  const handlePurchase = () => {
    if (selectedPack && phoneNumber.trim()) {
      purchaseCredits({
        packId: selectedPack.id,
        phoneNumber: phoneNumber.trim(),
        network,
      }, {
        onSuccess: (response) => {
          logger.info('Paiement MyPayGa initié', { response })
          
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
                    className="w-full text-left border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-[#146B67] hover:bg-[#146B67]/5 focus:outline-none focus:ring-2 focus:ring-[#146B67] focus:ring-offset-2 transition-all duration-200"
                    aria-label={`Sélectionner le pack ${pack.name} - ${pack.credits} crédits pour ${pack.price} FCFA`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-[#146B67]" />
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
                        <p className="font-bold text-[#146B67] dark:text-[#1FA89B]">
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

              <div className="space-y-3">
                <label htmlFor="payment-network" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Réseau
                </label>
                <select
                  id="payment-network"
                  value={network}
                  onChange={(event) => setNetwork(event.target.value as 'AM' | 'MM')}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#146B67] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="Ex: 077123456"
                    className="w-full px-4 py-3 pl-11 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#146B67] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Une demande de confirmation sera envoyée sur ce numéro.
                </p>
              </div>

              {isPending && (
                <div className="flex items-center justify-center gap-2 text-[#146B67]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Initiation du paiement...</span>
                </div>
              )}

              {isSuccess && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span>Paiement initié. Confirmez sur votre téléphone.</span>
                </div>
              )}

              {isError && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error?.message ?? 'Erreur lors de l’initiation du paiement'}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => preselectedPack ? handleClose() : setStep('select')}
                  disabled={isPending}
                  className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {preselectedPack ? 'Annuler' : 'Retour'}
                </button>
                <button
                  onClick={handlePurchase}
                  disabled={Boolean(isPending) || Boolean(!phoneNumber.trim())}
                  className="flex-1 py-3 bg-[#146B67] text-white rounded-xl font-medium hover:bg-[#125A56] disabled:opacity-50 transition-colors"
                >
                  Payer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
