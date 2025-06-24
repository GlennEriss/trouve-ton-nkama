'use client'

import React, { useState } from 'react'
import { Coins } from 'lucide-react'
import CreditBalanceDisplay from './CreditBalanceDisplay'
import CreditPacksList from './CreditPacksList'
import PremiumServicesInfo from './PremiumServicesInfo'
import CreditHistory from './CreditHistory'
import PurchaseModal from './PurchaseModal'

interface CreditPack {
  id: string
  name: string
  credits: number
  price: number
  originalPrice?: number
  savings?: number
  popular?: boolean
  bestValue?: boolean
  features?: string[]
}

export default function MyBalanceComponent() {
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false)
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null)

  const handleOpenRecharge = () => {
    setIsRechargeModalOpen(true)
  }

  const handleCloseRecharge = () => {
    setIsRechargeModalOpen(false)
    setSelectedPack(null) // Reset le pack quand on ferme
  }

  const handlePackSelect = (pack: CreditPack) => {
    setSelectedPack(pack)
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6 md:space-y-8 max-w-6xl">
      {/* Header Section */}
      <div className="text-center space-y-3 md:space-y-4">
        <div className="flex items-center justify-center gap-2 md:gap-3">
          <Coins className="w-6 h-6 md:w-8 md:h-8 text-[#146B67] dark:text-[#1FA89B]" />
          <h1 className="text-2xl md:text-3xl font-bold text-[#146B67] dark:text-[#1FA89B]">
            Mon Solde de Crédits
          </h1>
        </div>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
          Gérez vos crédits et accédez aux services premium LogisGabon pour booster la visibilité de vos annonces
        </p>
      </div>

      {/* Balance Display Section */}
      <CreditBalanceDisplay onRecharge={handleOpenRecharge} />

      {/* Credit Packs Section */}
      <CreditPacksList 
        onOpenModal={handleOpenRecharge}
        isModalOpen={isRechargeModalOpen}
        onPackSelect={handlePackSelect}
      />

      {/* Premium Services Info Section */}
      <PremiumServicesInfo />

      {/* History Section */}
      <CreditHistory />

      {/* Purchase Modal */}
      <PurchaseModal 
        isOpen={isRechargeModalOpen} 
        onClose={handleCloseRecharge}
        preselectedPack={selectedPack}
      />
    </div>
  )
} 