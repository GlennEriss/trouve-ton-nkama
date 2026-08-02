'use client'

import React from 'react'
import CreditBalanceDisplay from './CreditBalanceDisplay'
import CreditHistory from './CreditHistory'
import MyBalanceNavigation from './MyBalanceNavigation'

export default function MyBalanceHistoryComponent() {
  return (
    <div className="container-page px-4 md:px-6 py-4 md:py-6 space-y-6 md:space-y-8">
      <MyBalanceNavigation
        title="Historique de crédits"
        description="Consultez votre solde actuel et toutes vos transactions de crédits (achats et dépenses)."
      />

      <CreditBalanceDisplay />
      <CreditHistory />
    </div>
  )
}
