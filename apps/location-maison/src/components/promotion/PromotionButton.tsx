'use client'

import React, { useState } from 'react'
import { Button } from '@trouve-ton-nkama/ui/button'
import { TrendingUp, Star } from 'lucide-react'
import { Property } from '@/models/annonce'
import { PromotionModal } from './PromotionModal'

interface PromotionButtonProps {
  property: Property
}

export default function PromotionButton({ property }: Readonly<PromotionButtonProps>) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Vérifier si l'annonce a une promotion active
  const hasActivePromotion = property.currentPromotion?.isActive && 
    property.currentPromotion?.endDate && 
    new Date(property.currentPromotion.endDate.seconds * 1000) > new Date()

  const getPromotionIcon = () => {
    if (!hasActivePromotion) return <TrendingUp size={16} className="text-white" />
    
    switch (property.currentPromotion?.type) {
      case 'featured':
        return <Star size={16} className="text-white" />
      case 'trending-7d':
      case 'trending-3d':
        return <TrendingUp size={16} className="text-white" />
      default:
        return <TrendingUp size={16} className="text-white" />
    }
  }

  const getButtonText = () => {
    if (hasActivePromotion) {
      switch (property.currentPromotion?.type) {
        case 'featured':
          return 'À la une'
        case 'trending-7d':
        case 'trending-3d':
          return 'En tendance'
        // Pas de cas 'boost' ici : duration: 0 par design (PROMOTION_CONFIGS) veut dire
        // endDate === startDate, donc `hasActivePromotion` (qui exige endDate > maintenant)
        // ne peut structurellement jamais être vrai pour ce type — ce cas était mort (jamais
        // atteint), constaté en e2e réel (property-promotion.spec.ts). Le boost fonctionne
        // bien (remonte l'annonce en tête de liste), il n'affiche juste jamais de badge/état
        // persistant, cohérent avec sa description ("remontée instantanée").
        default:
          return 'Promue'
      }
    }
    return 'Promouvoir'
  }

  return (
    <>
      <Button
        className={`h-11 w-full rounded-full px-3 text-sm font-semibold transition-colors ${
          hasActivePromotion
            ? 'border border-amber-600 bg-amber-600 text-white hover:bg-amber-700'
            : 'bg-primary text-white hover:bg-primary-800'
        }`}
        onClick={() => setIsModalOpen(true)}
      >
        {getPromotionIcon()}
        <span className="truncate">{getButtonText()}</span>
      </Button>

      <PromotionModal
        property={property}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
