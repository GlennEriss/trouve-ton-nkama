'use client'

import React from 'react'
import { Crown, TrendingUp, Star, Zap } from 'lucide-react'

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

interface CreditPackCardProps {
  pack: CreditPack
  onSelect: (pack: CreditPack) => void
  isLoading?: boolean
}

export default function CreditPackCard({ pack, onSelect, isLoading = false }: Readonly<CreditPackCardProps>) {
  const handleSelect = () => {
    if (!isLoading) {
      onSelect(pack)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSelect()
    }
  }

  const getPackIcon = () => {
    if (pack.bestValue) return <Crown className="w-6 h-6" />
    if (pack.popular) return <Star className="w-6 h-6" />
    if (pack.savings && pack.savings > 20) return <TrendingUp className="w-6 h-6" />
    return <Zap className="w-6 h-6" />
  }

  const pricePerCredit = pack.price / pack.credits

  return (
    <button className={`
      relative bg-white dark:bg-gray-800 border-2 rounded-2xl p-6 transition-all duration-300 cursor-pointer text-left w-full
      ${pack.popular ? 'border-[#1FA89B] shadow-lg scale-105' : 'border-gray-200 dark:border-gray-700 hover:border-[#146B67] dark:hover:border-[#1FA89B]'}
      ${pack.bestValue ? 'border-gradient-to-r from-yellow-400 to-orange-500' : ''}
      hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#1FA89B] focus:ring-offset-2
      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
    `} 
    onClick={handleSelect}
    onKeyDown={handleKeyDown}
    disabled={isLoading}
    aria-label={`Sélectionner le pack ${pack.name} - ${pack.credits} crédits pour ${pack.price} FCFA`}
    >
      
      {/* Badge */}
      {(pack.popular || pack.bestValue || pack.savings) && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className={`
            px-4 py-1 rounded-full text-xs font-bold text-white
            ${pack.bestValue ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : ''}
            ${pack.popular ? 'bg-gradient-to-r from-[#146B67] to-[#1FA89B]' : ''}
            ${pack.savings && !pack.popular && !pack.bestValue ? 'bg-gradient-to-r from-green-500 to-emerald-500' : ''}
          `}>
            {pack.bestValue && '💎 MEILLEUR PRIX'}
            {pack.popular && !pack.bestValue && '🏆 POPULAIRE'}
            {pack.savings && !pack.popular && !pack.bestValue && `${pack.savings}% D'ÉCONOMIE`}
          </div>
        </div>
      )}

      <div className="space-y-6 text-center">
        {/* Icon & Name */}
        <div className="space-y-3">
          <div className={`
            w-16 h-16 mx-auto rounded-full flex items-center justify-center
            ${pack.popular ? 'bg-[#1FA89B]/20 text-[#1FA89B]' : 'bg-[#146B67]/20 text-[#146B67] dark:text-[#1FA89B]'}
          `}>
            {getPackIcon()}
          </div>
          <h3 className="text-2xl font-bold text-[#146B67] dark:text-[#1FA89B]">
            {pack.name}
          </h3>
        </div>

        {/* Credits */}
        <div className="space-y-2">
          <div className="text-4xl font-bold text-gray-900 dark:text-white">
            {pack.credits.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            crédits
          </div>
        </div>

        {/* Price */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            {pack.originalPrice && (
              <span className="text-lg text-gray-400 line-through">
                {pack.originalPrice.toLocaleString()} FCFA
              </span>
            )}
            <span className="text-2xl font-bold text-[#146B67] dark:text-[#1FA89B]">
              {pack.price.toLocaleString()} FCFA
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round(pricePerCredit)} FCFA par crédit
          </div>
        </div>

        {/* Features */}
        {pack.features && pack.features.length > 0 && (
          <div className="space-y-2">
            {pack.features.map((feature, index) => (
              <div key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#146B67] dark:bg-[#1FA89B] rounded-full" />
                {feature}
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        <button 
          className={`
            w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300
            ${pack.popular 
              ? 'bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white hover:brightness-110 shadow-lg' 
              : 'bg-[#146B67] hover:bg-[#1FA89B] text-white'
            }
            ${isLoading ? 'cursor-not-allowed' : 'hover:shadow-lg'}
          `}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Traitement...
            </div>
          ) : (
            'Choisir ce pack'
          )}
        </button>

        {/* Savings highlight */}
        {pack.savings && pack.savings > 0 && (
          <div className="text-sm font-medium text-green-600 dark:text-green-400">
            Économisez {pack.savings}% par rapport au pack de base
          </div>
        )}
      </div>
    </button>
  )
} 