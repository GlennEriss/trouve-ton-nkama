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
  onSelect?: (pack: CreditPack) => void
  isLoading?: boolean
}

export default function CreditPackCard({ pack, onSelect, isLoading = false }: Readonly<CreditPackCardProps>) {
  const handleSelect = () => {
    if (!isLoading && onSelect) {
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
    <div
      role="button"
      tabIndex={isLoading ? -1 : 0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={`
      relative bg-white dark:bg-gray-800 border-2 rounded-2xl p-6 transition-all duration-300 text-left w-full
      ${pack.popular ? 'border-secondary shadow-lg scale-105' : 'border-gray-200 dark:border-gray-700'}
      ${pack.bestValue ? 'border-gradient-to-r from-yellow-400 to-orange-500' : ''}
      ${isLoading ? 'opacity-50 cursor-not-allowed' : 'opacity-100 cursor-pointer hover:border-primary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'}
    `}
    aria-label={`Choisir le pack ${pack.name} - ${pack.credits} crédits pour ${pack.price} FCFA`}
    >
      
      {/* Badge */}
      {(pack.popular || pack.bestValue || pack.savings) && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className={`
            px-4 py-1 rounded-full text-xs font-bold text-white
            ${pack.bestValue ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : ''}
            ${pack.popular ? 'bg-gradient-to-r from-primary to-secondary' : ''}
            ${pack.savings && !pack.popular && !pack.bestValue ? 'bg-gradient-to-r from-green-500 to-emerald-500' : ''}
          `}>
            {pack.bestValue && 'MEILLEUR PRIX'}
            {pack.popular && !pack.bestValue && 'POPULAIRE'}
            {pack.savings && !pack.popular && !pack.bestValue && `${pack.savings}% D'ÉCONOMIE`}
          </div>
        </div>
      )}

      <div className="space-y-6 text-center">
        {/* Icon & Name */}
        <div className="space-y-3">
          <div className={`
            w-16 h-16 mx-auto rounded-full flex items-center justify-center
            ${pack.popular ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary dark:text-secondary'}
          `}>
            {getPackIcon()}
          </div>
          <h3 className="text-2xl font-bold text-primary dark:text-secondary">
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
              <span className="text-lg text-gray-600 line-through dark:text-gray-400">
                {pack.originalPrice.toLocaleString()} FCFA
              </span>
            )}
            <span className="text-2xl font-bold text-primary dark:text-secondary">
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
            {pack.features.map((feature) => (
              <div key={feature} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary dark:bg-secondary rounded-full" />
                {feature}
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        <div
          className={`
            w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 text-center
            ${isLoading
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-primary text-white'}
          `}
        >
          {isLoading ? 'Chargement…' : 'Choisir ce pack'}
        </div>

        {/* Savings highlight */}
        {pack.savings && pack.savings > 0 && (
          <div className="text-sm font-medium text-green-700 dark:text-green-300">
            Économisez {pack.savings}% par rapport au pack de base
          </div>
        )}
      </div>
    </div>
  )
} 
