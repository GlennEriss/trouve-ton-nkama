'use client'

import React from 'react'
import { Package, Info } from 'lucide-react'
import CreditPackCard from './CreditPackCard'
import Image from 'next/image'
import { useCreditPacks } from '@/hooks/use-credit-packs'
import {
  toUiCreditPack,
  type CreditPackUi,
} from '@/lib/credits/credit-packs'
import { useRecharge } from '@/providers/RechargeProvider'
import { PAYMENT_METHODS } from '@/constantes/payment-methods'

interface CreditPacksListProps {
  onOpenModal?: () => void
  onPackSelect?: (pack: CreditPackUi) => void
}

const paymentMethods = PAYMENT_METHODS
export default function CreditPacksList({ onOpenModal, onPackSelect }: Readonly<CreditPacksListProps>) {
  const creditPacksQuery = useCreditPacks()
  const { openRecharge } = useRecharge()
  const creditPacks = React.useMemo(() => {
    const source = creditPacksQuery.data?.packs ?? []
    return source.map(toUiCreditPack)
  }, [creditPacksQuery.data?.packs])

  const handlePackSelect = (pack: CreditPackUi) => {
    // Si un parent fournit ses propres handlers, on les respecte (rétrocompat).
    if (onPackSelect || onOpenModal) {
      onPackSelect?.(pack)
      onOpenModal?.()
      return
    }
    // Sinon, ouvrir directement le flux de recharge MyPayGa.
    openRecharge(pack)
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 md:space-y-4">
        <div className="flex items-center justify-center gap-2 md:gap-3">
          <Package className="w-6 h-6 md:w-7 md:h-7 text-[#146B67] dark:text-[#1FA89B]" />
          <h2 className="text-2xl md:text-3xl font-bold text-[#146B67] dark:text-[#1FA89B]">
            Packs de Crédits
          </h2>
        </div>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
          Rechargez votre solde et profitez d'économies progressives. Plus vous achetez, plus vous économisez !
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <Info className="w-4 h-4 flex-shrink-0" />
            <p>Recharge instantanée par mobile money (Airtel Money / Moov Money). Vos crédits sont ajoutés après confirmation du paiement.</p>
          </div>
        </div>
        {creditPacksQuery.isError ? (
          <p className="text-xs text-red-700 dark:text-red-300">
            Impossible de charger les packs admin pour le moment.
          </p>
        ) : null}
      </div>

      {/* Packs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {creditPacks.map((pack) => (
          <CreditPackCard
            key={pack.id}
            pack={pack}
            onSelect={handlePackSelect}
            isLoading={creditPacksQuery.isFetching}
          />
        ))}
      </div>
      {!creditPacksQuery.isFetching && creditPacks.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Aucun pack actif n&apos;est configuré dans le dashboard admin.
        </div>
      ) : null}

      {/* Info Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
          <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mx-auto md:mx-0">
            <Package className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-2 text-center md:text-left">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200">
              Conseils d'achat
            </h3>
            <ul className="list-disc space-y-1 pl-4 text-xs text-blue-700 marker:text-blue-500 dark:text-blue-300 md:text-sm">
              <li><strong>Pack Standard</strong> : Parfait pour débuter, excellent rapport qualité/prix</li>
              <li><strong>Pack Avancé</strong> : Idéal pour une utilisation régulière avec 25% d'économies</li>
              <li><strong>Pack Premium</strong> : Maximum d'économies (37.5%) pour les utilisateurs intensifs</li>
              <li>Vos crédits n'expirent jamais, achetez en toute sérénité</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Payment Methods Info */}
      <div className="text-center space-y-3">
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
          Paiement sécurisé avec
        </p>
        <div className="flex flex-row items-center justify-center gap-6 sm:gap-10">
          {paymentMethods.map((method) => (
            <div key={method.id} className="relative w-32 h-20 md:w-40 md:h-24 flex-shrink-0">
              <Image
                src={`/assets/balance/${method.icon}`}
                alt={method.name}
                fill
                className="object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 
