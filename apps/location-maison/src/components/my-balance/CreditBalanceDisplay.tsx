'use client'

import React from 'react'
import { Wallet, Zap, Gift, Loader2, AlertCircle } from 'lucide-react'
import { useCreditsBalance } from '@/hooks/use-credits-balance'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useSession } from 'next-auth/react'
import { useRecharge } from '@/providers/RechargeProvider'

interface CreditBalanceDisplayProps {
  onRecharge?: () => void
}

export default function CreditBalanceDisplay({
  onRecharge
}: Readonly<CreditBalanceDisplayProps>) {
  const { data: balanceData, isLoading, error, isError } = useCreditsBalance()
  const { user } = useCurrentUser()
  const { update, data: session } = useSession();
  const { openRecharge } = useRecharge()
  const balance = balanceData?.credits ?? 0
  const isNewUser = balanceData?.message?.includes('Bienvenue') ?? false
  const welcomeCredits = 3

  // Calculer le statut du solde
  const getStatusColor = () => {
    if (balance > 10) return 'bg-green-500'
    if (balance > 5) return 'bg-yellow-500'
    return 'bg-red-500'
  }
  
  const getStatusText = () => {
    if (balance > 10) return 'Solde élevé'
    if (balance > 5) return 'Solde modéré'
    return 'Solde faible'
  }

  const statusColor = getStatusColor()
  const statusText = getStatusText()

  // Mettre à jour la session avec le nouveau solde
  React.useEffect(() => {
    if (user?.credits !== balance) {
      update({
        user: {
          ...session?.user,
          credits: balance
        }
      })
    }
  }, [user, balance, session?.user, update])

  const handleRecharge = () => {
    if (onRecharge) {
      onRecharge()
    } else {
      openRecharge()
    }
  }

  // État de chargement
  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-[#146B67]/10 via-[#1FA89B]/10 to-[#146B67]/10 dark:from-[#146B67]/20 dark:via-[#1FA89B]/20 dark:to-[#146B67]/20 rounded-2xl p-8">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#146B67]" />
          <span className="text-gray-600 dark:text-gray-400">
            Chargement de votre solde...
          </span>
        </div>
      </div>
    )
  }

  // État d'erreur
  if (isError) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-2xl p-8">
        <div className="flex items-center justify-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-6 h-6" />
          <div className="text-center">
            <p className="font-semibold">Erreur de chargement</p>
            <p className="text-sm">{error?.message ?? 'Impossible de récupérer votre solde'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-[#146B67]/10 via-[#1FA89B]/10 to-[#146B67]/10 dark:from-[#146B67]/20 dark:via-[#1FA89B]/20 dark:to-[#146B67]/20 rounded-2xl p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 opacity-5 dark:opacity-10">
        <Wallet className="w-32 h-32 text-[#146B67]" />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Welcome Banner for new users */}
        {isNewUser && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
            <Gift className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-200">
                Bienvenue ! Vous avez reçu {welcomeCredits} crédits gratuits
              </p>
              <p className="text-sm text-green-600 dark:text-green-300">
                Valables 30 jours pour découvrir nos services premium
              </p>
            </div>
          </div>
        )}

        {/* Balance Display */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Wallet className="w-6 h-6 md:w-8 md:h-8 text-[#146B67] dark:text-[#1FA89B]" />
            <span className="text-base md:text-lg font-medium text-gray-600 dark:text-gray-300">
              Solde actuel
            </span>
          </div>

          <div className="text-3xl md:text-5xl font-bold text-[#146B67] dark:text-[#1FA89B]">
            {balance.toLocaleString()}
            <span className="text-lg md:text-xl ml-2 font-medium text-gray-500 dark:text-gray-400">
              crédit{balance > 1 ? 's' : ''}
            </span>
          </div>

          {/* Status indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${statusColor}`} />
              <span className="text-gray-600 dark:text-gray-400">
                {statusText}
              </span>
            </div>
          </div>

          {/* Message du serveur */}
          {balanceData?.message && !isNewUser && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {balanceData.message}
            </p>
          )}
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleRecharge}
            className="bg-[#146B67] hover:bg-[#125A56] text-white px-6 md:px-8 py-2.5 md:py-3 rounded-full font-semibold inline-flex items-center gap-2 text-sm md:text-base transition-colors focus:outline-none focus:ring-2 focus:ring-[#146B67] focus:ring-offset-2"
          >
            <Zap className="w-4 h-4 md:w-5 md:h-5" />
            Recharger mon solde
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Paiement mobile money sécurisé via MyPayGa
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="text-center">
            <div className="text-base md:text-lg font-bold text-[#146B67] dark:text-[#1FA89B]">
              {Math.floor(balance / 15)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
              Mises à la une possibles
            </div>
          </div>
          <div className="text-center">
            <div className="text-base md:text-lg font-bold text-[#146B67] dark:text-[#1FA89B]">
              {Math.floor(balance / 10)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
              Mises en tendance (7j)
            </div>
          </div>
          <div className="text-center">
            <div className="text-base md:text-lg font-bold text-[#146B67] dark:text-[#1FA89B]">
              {Math.floor(balance / 5)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
              Mises en tendance (3j)
            </div>
          </div>
          <div className="text-center">
            <div className="text-base md:text-lg font-bold text-[#146B67] dark:text-[#1FA89B]">
              {balance}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
              Assistances IA
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
