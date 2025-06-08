'use client'

import React from 'react'
import { Package } from 'lucide-react'
import CreditPackCard from './CreditPackCard'

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

interface CreditPacksListProps {
  onOpenModal: () => void
  isModalOpen: boolean
  onPackSelect?: (pack: CreditPack) => void
}

// Données basées sur le plan financier
const creditPacks: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 5,
    price: 2000,
    popular: false,
    features: ['Idéal pour tester', 'Support standard']
  },
  {
    id: 'standard',
    name: 'Standard',
    credits: 10,
    price: 3500,
    originalPrice: 4000,
    savings: 12.5,
    popular: true,
    features: ['Pack le plus choisi', 'Support prioritaire', 'Économique']
  },
  {
    id: 'advanced',
    name: 'Avancé',
    credits: 25,
    price: 7500,
    originalPrice: 10000,
    savings: 25,
    features: ['Excellent rapport qualité/prix', 'Support prioritaire', 'Bonus: conseils personnalisés']
  },
  {
    id: 'premium',
    name: 'Premium',
    credits: 50,
    price: 12500,
    originalPrice: 20000,
    savings: 37.5,
    bestValue: true,
    features: ['Meilleure économie', 'Support VIP', 'Conseils dédiés', 'Accès prioritaire aux nouveautés']
  }
]

export default function CreditPacksList({ onOpenModal, onPackSelect }: CreditPacksListProps) {
  const handlePackSelect = (pack: CreditPack) => {
    // Communiquer le pack sélectionné au parent
    if (onPackSelect) {
      onPackSelect(pack)
    }
    // Ouvrir le modal du parent
    onOpenModal()
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
      </div>

      {/* Packs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {creditPacks.map((pack) => (
          <CreditPackCard
            key={pack.id}
            pack={pack}
            onSelect={handlePackSelect}
            isLoading={false}
          />
        ))}
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
          <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mx-auto md:mx-0">
            <Package className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-2 text-center md:text-left">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200">
              💡 Conseils d'achat
            </h3>
            <div className="text-xs md:text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p>• <strong>Pack Standard</strong> : Parfait pour débuter, excellent rapport qualité/prix</p>
              <p>• <strong>Pack Avancé</strong> : Idéal pour une utilisation régulière avec 25% d'économies</p>
              <p>• <strong>Pack Premium</strong> : Maximum d'économies (37.5%) pour les utilisateurs intensifs</p>
              <p>• Vos crédits n'expirent jamais, achetez en toute sérénité</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods Info */}
      <div className="text-center space-y-3">
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
          Paiement sécurisé avec
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold text-xs md:text-sm">
              A
            </div>
            Airtel Money
          </div>
          <div className="hidden sm:block text-gray-300 dark:text-gray-600">•</div>
          <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
            Autres méthodes bientôt disponibles
          </div>
        </div>
      </div>
    </div>
  )
} 