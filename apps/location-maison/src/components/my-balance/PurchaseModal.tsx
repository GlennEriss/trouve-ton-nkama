/**
 * Modal pour l'achat de packs de crédits
 */

'use client'

import React, { useState, useEffect } from 'react'
import { X, Package, Smartphone, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useCreditsPurchase } from '@/hooks/use-credits-purchase'
import { useToast } from '@/hooks/use-toast'

interface CreditPack {
  id: string
  name: string
  credits: number
  price: number
  savings?: number
}

interface PurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedPack?: CreditPack | null
}

const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 5,
    price: 2000
  },
  {
    id: 'standard',
    name: 'Standard',
    credits: 10,
    price: 3500,
    savings: 12.5
  },
  {
    id: 'advanced',
    name: 'Avancé',
    credits: 25,
    price: 7500,
    savings: 25
  },
  {
    id: 'premium',
    name: 'Premium',
    credits: 50,
    price: 12500,
    savings: 37.5
  }
]

export default function PurchaseModal({ isOpen, onClose, preselectedPack }: PurchaseModalProps) {
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [step, setStep] = useState<'select' | 'phone' | 'confirm'>('select')
  
  const { mutate: purchaseCredits, isPending, isSuccess, isError, error } = useCreditsPurchase()
  const { toast } = useToast()

  // Effet pour gérer le pack présélectionné
  useEffect(() => {
    if (preselectedPack && isOpen) {
      setSelectedPack(preselectedPack)
      setStep('phone')
    } else if (!preselectedPack && isOpen) {
      setStep('select')
    }
  }, [preselectedPack, isOpen])

  const handlePackSelect = (pack: CreditPack) => {
    setSelectedPack(pack)
    setStep('phone')
  }

  const handlePhoneSubmit = () => {
    if (phoneNumber.trim()) {
      setStep('confirm')
    }
  }

  const handlePurchase = () => {
    if (selectedPack && phoneNumber) {
      purchaseCredits({
        packId: selectedPack.id,
        phoneNumber: phoneNumber.trim()
      }, {
        onSuccess: (response) => {
          console.log('Achat réussi:', response)
          
          // Toast de succès
          toast({
            title: "✅ Achat réussi !",
            description: `${selectedPack.credits} crédits ajoutés à votre solde`,
          })
          
          // Fermer la modal après 2 secondes
          setTimeout(() => {
            handleClose()
          }, 2000)
        },
        onError: (error) => {
          console.error('Erreur achat:', error)
          
          // Toast d'erreur
          toast({
            title: "❌ Erreur de paiement",
            description: error.message || 'Une erreur est survenue lors du paiement',
            variant: "destructive"
          })
        }
      })
    }
  }

  const formatPhoneNumber = (value: string) => {
    // Nettoyer et formater le numéro
    const cleaned = value.replace(/\D/g, '')
    
    // Format: +241 XX XX XX XX
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 5) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5)}`
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formatted = formatPhoneNumber(value)
    setPhoneNumber(formatted)
  }

  const isValidPhone = () => {
    const cleaned = phoneNumber.replace(/\D/g, '')
    return cleaned.length >= 8 && (cleaned.startsWith('241') || cleaned.length === 8)
  }

  const resetModal = () => {
    setSelectedPack(null)
    setPhoneNumber('')
    setStep('select')
  }

  const handleClose = () => {
    resetModal()
    onClose()
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
                {CREDIT_PACKS.map((pack) => (
                  <div
                    key={pack.id}
                    onClick={() => handlePackSelect(pack)}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-[#146B67] hover:bg-[#146B67]/5 transition-all duration-200"
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Étape 2: Numéro de téléphone */}
          {step === 'phone' && selectedPack && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Pack sélectionné: {selectedPack.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedPack.credits} crédits - {selectedPack.price.toLocaleString()} FCFA
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Numéro Airtel Money
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="241 XX XX XX XX"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#146B67] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Format: +241 XX XX XX XX ou XX XX XX XX
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Vous recevrez une notification Airtel Money pour confirmer le paiement.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => preselectedPack ? handleClose() : setStep('select')}
                  className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {preselectedPack ? 'Annuler' : 'Retour'}
                </button>
                <button
                  onClick={handlePhoneSubmit}
                  disabled={!isValidPhone()}
                  className="flex-1 py-3 bg-[#146B67] text-white rounded-xl font-medium hover:bg-[#125A56] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* Étape 3: Confirmation */}
          {step === 'confirm' && selectedPack && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Confirmer l'achat
                </h3>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Pack:</span>
                  <span className="font-medium">{selectedPack.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Crédits:</span>
                  <span className="font-medium">{selectedPack.credits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Prix:</span>
                  <span className="font-bold text-[#146B67] dark:text-[#1FA89B]">
                    {selectedPack.price.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Numéro:</span>
                  <span className="font-medium">{phoneNumber}</span>
                </div>
              </div>

              {/* État des requêtes */}
              {isPending && (
                <div className="flex items-center justify-center gap-2 text-[#146B67]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Initiation du paiement...</span>
                </div>
              )}

              {isSuccess && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span>Paiement initié avec succès !</span>
                </div>
              )}

              {isError && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error?.message || 'Erreur lors du paiement'}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('phone')}
                  disabled={isPending}
                  className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Retour
                </button>
                <button
                  onClick={isSuccess ? handleClose : handlePurchase}
                  disabled={isPending}
                  className="flex-1 py-3 bg-[#146B67] text-white rounded-xl font-medium hover:bg-[#125A56] disabled:opacity-50 transition-colors"
                >
                  {isSuccess ? 'Fermer' : `Payer ${selectedPack.price.toLocaleString()} FCFA`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 