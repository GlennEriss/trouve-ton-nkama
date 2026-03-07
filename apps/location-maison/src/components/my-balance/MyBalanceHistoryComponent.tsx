'use client'

import React from 'react'
import CreditBalanceDisplay from './CreditBalanceDisplay'
import CreditHistory from './CreditHistory'
import MyBalanceNavigation from './MyBalanceNavigation'

export default function MyBalanceHistoryComponent() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6 md:space-y-8 max-w-[1280px] 2xl:max-w-[1440px]">
      <MyBalanceNavigation
        title="Historique de crédits"
        description="Consultez votre solde actuel et toutes vos transactions de crédits (achats et dépenses)."
      />

      <CreditBalanceDisplay />
      <CreditHistory />
    </div>
  )
}
