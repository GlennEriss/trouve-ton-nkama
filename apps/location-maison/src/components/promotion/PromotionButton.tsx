'use client'

import React, { useState } from 'react'
import { Button } from '../ui/button'
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
        case 'boost':
          return 'Boostée'
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
            : 'bg-[#146B67] text-white hover:bg-[#0f5a56]'
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
