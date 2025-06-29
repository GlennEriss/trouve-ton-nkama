'use client'

import React from 'react'
import { Property } from '@/models/annonce'
import { Star, TrendingUp, ArrowUpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PromotionBadgeProps {
  property: Property
  className?: string
}

export default function PromotionBadge({ property, className }: Readonly<PromotionBadgeProps>) {
  // Vérifier si l'annonce a une promotion active
  const hasActivePromotion = property.currentPromotion?.isActive && 
    property.currentPromotion?.endDate && 
    new Date(property.currentPromotion.endDate.seconds * 1000) > new Date()

  if (!hasActivePromotion) return null

  const getPromotionConfig = () => {
    switch (property.currentPromotion?.type) {
      case 'featured':
        return {
          label: 'À la une',
          icon: Star,
          gradient: 'from-yellow-500 to-orange-500',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          textColor: 'text-yellow-700 dark:text-yellow-300',
          borderColor: 'border-yellow-200 dark:border-yellow-700'
        }
      case 'trending-7d':
        return {
          label: 'Tendance',
          icon: TrendingUp,
          gradient: 'from-blue-500 to-cyan-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          textColor: 'text-blue-700 dark:text-blue-300',
          borderColor: 'border-blue-200 dark:border-blue-700'
        }
      case 'trending-3d':
        return {
          label: 'Tendance',
          icon: TrendingUp,
          gradient: 'from-indigo-500 to-purple-500',
          bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
          textColor: 'text-indigo-700 dark:text-indigo-300',
          borderColor: 'border-indigo-200 dark:border-indigo-700'
        }
      case 'boost':
        return {
          label: 'Boostée',
          icon: ArrowUpCircle,
          gradient: 'from-green-500 to-emerald-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          textColor: 'text-green-700 dark:text-green-300',
          borderColor: 'border-green-200 dark:border-green-700'
        }
      default:
        return null
    }
  }

  const config = getPromotionConfig()
  if (!config) return null

  const Icon = config.icon

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md border",
      config.bgColor,
      config.textColor,
      config.borderColor,
      className
    )}>
      <Icon size={12} />
      <span>{config.label}</span>
    </div>
  )
} 