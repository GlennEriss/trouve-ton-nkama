'use client'

import React from 'react'
import { Coins } from 'lucide-react'
import CreditBalanceDisplay from './CreditBalanceDisplay'
import CreditPacksList from './CreditPacksList'
import PremiumServicesInfo from './PremiumServicesInfo'
import CreditHistory from './CreditHistory'

export default function MyBalanceComponent() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6 md:space-y-8 max-w-[1280px] 2xl:max-w-[1440px]">
      {/* Header Section */}
      <div className="text-center space-y-3 md:space-y-4">
        <div className="flex items-center justify-center gap-2 md:gap-3">
          <Coins className="w-6 h-6 md:w-8 md:h-8 text-[#146B67] dark:text-[#1FA89B]" />
          <h1 className="text-2xl md:text-3xl font-bold text-[#146B67] dark:text-[#1FA89B]">
            Mon Solde de Crédits
          </h1>
        </div>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
          Gérez vos crédits et accédez aux services premium Trouve Ton Nkama pour booster la visibilité de vos annonces
        </p>
      </div>

      {/* Balance Display Section */}
      <CreditBalanceDisplay />

      {/* Credit Packs Section */}
      <CreditPacksList />

      {/* Premium Services Info Section */}
      <PremiumServicesInfo />

      {/* History Section */}
      <CreditHistory />
    </div>
  )
}
