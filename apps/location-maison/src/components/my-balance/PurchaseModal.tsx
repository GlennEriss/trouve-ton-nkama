/**
 * Modal pour l'achat de packs de crédits
 */

'use client'

import React, { useState, useEffect } from 'react'
import { X, Package, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
/* import { useCreditsPurchase } from '@/hooks/use-credits-purchase' */
import { useVerifyCode } from '@/hooks/use-verify-code'
import { useToast } from '@/hooks/use-toast'
import { createLogger } from '@/lib/logger'

const logger = createLogger('components.purchase-modal')

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

export default function PurchaseModal({ isOpen, onClose, preselectedPack }: Readonly<PurchaseModalProps>) {
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null)
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'select' | 'instructions' | 'code'>('select')
  
  /* const { mutate: purchaseCredits, isPending, isSuccess, isError, error } = useCreditsPurchase() */
  const { 
    mutate: verifyCode, 
    isPending: isVerifying, 
    isSuccess: isVerified, 
    isError: hasError, 
    error: verifyError 
  } = useVerifyCode()
  const { toast } = useToast()

  // Effet pour initialiser le modal avec le pack présélectionné
  useEffect(() => {
    initializeWithPreselectedPack()
  }, [preselectedPack])

  // Méthode pour initialiser le modal avec le pack présélectionné
  const initializeWithPreselectedPack = () => {
    if (preselectedPack) {
      setSelectedPack(preselectedPack)
      setStep('instructions')
    } else {
      // Réinitialiser si pas de pack présélectionné
      setSelectedPack(null)
      if (step !== 'select') {
        setStep('select')
      }
    }
  }

  const handlePackSelect = (pack: CreditPack) => {
    setSelectedPack(pack)
    setStep('instructions')
  }

  const handleInstructionsConfirm = () => {
    setStep('code')
  }

  const handlePurchase = () => {
    if (selectedPack && code) {
      verifyCode({
        code: code.trim(),
        amount: selectedPack.price
      }, {
        onSuccess: (response) => {
          logger.info('Code vérifié', { response })
          
          toast({
            title: "✅ Code validé !",
            description: `${selectedPack.credits} crédits ajoutés à votre solde`,
          })
          
          // Réinitialiser le code mais garder le pack sélectionné
          setCode('')
          setStep('instructions')
        },
        onError: (error) => {
          logger.error('Erreur vérification du code', { error })
          
          toast({
            title: "❌ Erreur de validation",
            description: error.message ?? 'Une erreur est survenue lors de la validation du code',
            variant: "destructive"
          })
        }
      })
    }
  }

  const resetModal = () => {
    setSelectedPack(null)
    setCode('')
    setStep('select')
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const handleKeyDown = (event: React.KeyboardEvent, pack: CreditPack) => {
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
                {CREDIT_PACKS.map((pack) => (
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
            </div>
          )}

          {/* Étape 2: Instructions */}
          {step === 'instructions' && selectedPack && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Instructions de paiement
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Pack {selectedPack.name} - {selectedPack.price.toLocaleString()} FCFA
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Pour obtenir votre code de paiement, suivez ces étapes :
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300">
                  <li>Faites un retrait de {selectedPack.price.toLocaleString()} FCFA sur le code Agent {process.env.NEXT_PUBLIC_AGENT_CODE_AIRTEL}</li>
                  <li>Vous recevrez un code de paiement par SMS</li>
                  <li>Entrez ce code dans l'étape suivante</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => preselectedPack ? handleClose() : setStep('select')}
                  className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {preselectedPack ? 'Annuler' : 'Retour'}
                </button>
                <button
                  onClick={handleInstructionsConfirm}
                  className="flex-1 py-3 bg-[#146B67] text-white rounded-xl font-medium hover:bg-[#125A56] transition-colors"
                >
                  J'ai le code
                </button>
              </div>
            </div>
          )}

          {/* Étape 3: Saisie du code */}
          {step === 'code' && selectedPack && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Entrez votre code
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pack {selectedPack.name} - {selectedPack.price.toLocaleString()} FCFA
                </p>
              </div>

              <div className="space-y-3">
                <label htmlFor="payment-code-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Code de paiement
                </label>
                <input
                  id="payment-code-input"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Entrez le code reçu"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#146B67] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Le code a été envoyé par SMS après votre paiement
                </p>
              </div>

              {/* État des requêtes */}
              {isVerifying && (
                <div className="flex items-center justify-center gap-2 text-[#146B67]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Vérification du code...</span>
                </div>
              )}

              {isVerified && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span>Code validé avec succès !</span>
                </div>
              )}

              {hasError && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{verifyError?.message ?? 'Erreur lors de la validation du code'}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('instructions')}
                  disabled={isVerifying}
                  className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Retour
                </button>
                <button
                  onClick={handlePurchase}
                  disabled={Boolean(isVerifying) || Boolean(!code.trim())}
                  className="flex-1 py-3 bg-[#146B67] text-white rounded-xl font-medium hover:bg-[#125A56] disabled:opacity-50 transition-colors"
                >
                  Valider le code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
