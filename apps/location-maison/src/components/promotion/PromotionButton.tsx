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
        variant="ghost"
        size="sm"
        className={`w-full max-w-[120px] h-8 px-3 gap-1.5 text-xs font-medium transition-all duration-200 rounded-lg ${
          hasActivePromotion
            ? 'text-white bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 border border-yellow-400 shadow-md hover:shadow-lg'
            : 'text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 border border-amber-400 shadow-md hover:shadow-lg'
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