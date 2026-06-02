'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Property, PromotionType } from '@/models/annonce'
import { Megaphone, TrendingUp, ArrowUpCircle, Clock, Coins, CheckCircle2, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePromotion } from '@/hooks/use-promotion'
import { useRecharge } from '@/providers/RechargeProvider'

interface PromotionModalProps {
  property: Property
  isOpen: boolean
  onClose: () => void
}

interface PremiumService {
  id: PromotionType
  name: string
  description: string
  credits: number
  estimatedPrice: number
  icon: React.ComponentType<{ className?: string }>
  duration?: string
  benefits: string[]
  color: string
  disabled?: boolean
}

function getPromotionTypeName(promotionType: PromotionType | undefined): string {
  if (promotionType === 'featured') {
    return 'à la une';
  }
  if (promotionType === 'trending-7d') {
    return 'en tendance (7j)';
  }
  if (promotionType === 'trending-3d') {
    return 'en tendance (3j)';
  }
  return 'boostée';
}

export function PromotionModal({ property, isOpen, onClose }: Readonly<PromotionModalProps>) {
  const [selectedPromotion, setSelectedPromotion] = useState<PromotionType>(null)
  
  const {
    promoteProperty,
    isLoading,
    hasActivePromotion,
    canPromote,
    getPromotionStatus,
    userCredits
  } = usePromotion({
    property,
    onSuccess: onClose
  })
  const { openRecharge } = useRecharge()

  const currentPromotionType = hasActivePromotion ? property.currentPromotion?.type : null
  const promotionStatus = getPromotionStatus()

  const premiumServices: PremiumService[] = [
    {
      id: 'featured',
      name: 'Mise à la une',
      description: 'Votre annonce en première position sur la page d\'accueil',
      credits: 15,
      estimatedPrice: 5250,
      duration: '7 jours',
      icon: Megaphone,
      benefits: ['Visibilité maximale', 'Première position', '+300% de vues en moyenne'],
      color: 'from-yellow-500 to-orange-500',
      disabled: !canPromote('featured')
    },
    {
      id: 'trending-7d',
      name: 'Mise en tendance',
      description: 'Annonce prioritaire dans les résultats de recherche',
      credits: 10,
      estimatedPrice: 3500,
      duration: '7 jours',
      icon: TrendingUp,
      benefits: ['Apparition prioritaire', 'Badge "Tendance"', '+150% de contacts'],
      color: 'from-blue-500 to-cyan-500',
      disabled: !canPromote('trending-7d')
    },
    {
      id: 'trending-3d',
      name: 'Mise en tendance courte',
      description: 'Version courte de la mise en tendance',
      credits: 5,
      estimatedPrice: 2000,
      duration: '3 jours',
      icon: TrendingUp,
      benefits: ['Boost rapide', 'Idéal pour tester', '+100% de visibilité'],
      color: 'from-indigo-500 to-purple-500',
      disabled: !canPromote('trending-3d')
    },
    {
      id: 'boost',
      name: 'Remonter une annonce',
      description: 'Remise en haut de liste instantanée',
      credits: 3,
      estimatedPrice: 1200,
      icon: ArrowUpCircle,
      benefits: ['Action immédiate', 'Fraîcheur retrouvée', 'Parfait pour relancer'],
      color: 'from-green-500 to-emerald-500',
      disabled: !canPromote('boost')
    },
  ]

  const handlePromote = async () => {
    if (!selectedPromotion) return
    
    promoteProperty(selectedPromotion)
    setSelectedPromotion(null)
  }

  const selectedService = premiumServices.find(s => s.id === selectedPromotion)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="w-10 h-10 bg-gradient-to-r from-[#146B67] to-[#1FA89B] rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            Promouvoir votre annonce
          </DialogTitle>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Boostez la visibilité de "{property.title}" avec nos services premium
          </p>
        </DialogHeader>

        {/* Solde de crédits */}
        <div className="bg-gradient-to-r from-[#146B67]/5 to-[#1FA89B]/5 dark:from-[#146B67]/10 dark:to-[#1FA89B]/10 border border-[#146B67]/20 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#146B67] to-[#1FA89B] rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[#146B67] dark:text-[#1FA89B]">
                  Votre solde de crédits
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Crédits disponibles pour les promotions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-[#146B67] dark:text-[#1FA89B]">
                  {userCredits}
                </p>
                <p className="text-sm text-gray-500">crédits</p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => openRecharge()}
                className="bg-[#146B67] hover:bg-[#125A56] text-white"
              >
                <CreditCard className="w-4 h-4 mr-1.5" />
                Recharger
              </Button>
            </div>
          </div>
        </div>

        {/* Promotion actuelle */}
        {hasActivePromotion && promotionStatus && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">
                  Promotion active
                </h3>
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Votre annonce est actuellement {getPromotionTypeName(currentPromotionType)}
                  {promotionStatus.daysLeft > 0 && (
                    <span> - {promotionStatus.daysLeft} jour{promotionStatus.daysLeft > 1 ? 's' : ''} restant{promotionStatus.daysLeft > 1 ? 's' : ''}</span>
                  )}
                </p>
              </div>
              {promotionStatus.isExpiringSoon && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  Expire bientôt
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Grille des services */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {premiumServices.map((service) => {
            const hasEnoughCredits = userCredits >= service.credits
            const isCurrentPromotion = currentPromotionType === service.id && hasActivePromotion
            
            return (
              <button
                key={service.id}
                type="button"
                className={cn(
                  "relative border-2 rounded-2xl p-6 transition-all duration-300 text-left",
                  selectedPromotion === service.id
                    ? "border-[#146B67] bg-[#146B67]/5 dark:bg-[#146B67]/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-[#146B67]/50",
                  service.disabled && "opacity-50 cursor-not-allowed",
                  !hasEnoughCredits && "border-red-200 dark:border-red-800",
                  (!service.disabled && hasEnoughCredits) && "hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#146B67] focus:ring-offset-2"
                )}
                onClick={() => {
                  if (!service.disabled && hasEnoughCredits) {
                    setSelectedPromotion(service.id)
                  }
                }}
                disabled={service.disabled || !hasEnoughCredits}
                aria-label={`Sélectionner ${service.name} - ${service.credits} crédits`}
              >
                {isCurrentPromotion && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      Active
                    </Badge>
                  </div>
                )}

                {!hasEnoughCredits && !isCurrentPromotion && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="outline" className="text-red-600 border-red-300">
                      Crédits insuffisants
                    </Badge>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "flex-shrink-0 w-12 h-12 bg-gradient-to-r rounded-xl flex items-center justify-center",
                      service.color
                    )}>
                      <service.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {service.name}
                      </h3>
                      {service.duration && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-500">{service.duration}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {service.description}
                  </p>

                  {/* Coût */}
                  <div className={cn(
                    "flex items-center gap-3 p-3 rounded-xl",
                    hasEnoughCredits 
                      ? "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700" 
                      : "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20"
                  )}>
                    <Coins className={cn(
                      "w-5 h-5",
                      hasEnoughCredits 
                        ? "text-[#146B67] dark:text-[#1FA89B]" 
                        : "text-red-600 dark:text-red-400"
                    )} />
                    <div>
                      <div className={cn(
                        "text-lg font-bold",
                        hasEnoughCredits 
                          ? "text-[#146B67] dark:text-[#1FA89B]" 
                          : "text-red-600 dark:text-red-400"
                      )}>
                        {service.credits} crédits
                      </div>
                      <div className="text-xs text-gray-500">
                        ≈ {service.estimatedPrice.toLocaleString()} FCFA
                      </div>
                    </div>
                  </div>

                  {/* Avantages */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Avantages :
                    </div>
                    <ul className="space-y-1">
                      {service.benefits.slice(0, 2).map((benefit) => (
                        <li key={benefit} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <div className="w-1.5 h-1.5 bg-[#146B67] dark:bg-[#1FA89B] rounded-full flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Récapitulatif de la sélection */}
        {selectedService && (
          <div className="bg-[#146B67]/5 dark:bg-[#146B67]/10 border border-[#146B67]/20 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-[#146B67] dark:text-[#1FA89B] mb-2">
              Récapitulatif de votre sélection
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedService.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedService.duration && `Durée: ${selectedService.duration}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[#146B67] dark:text-[#1FA89B]">
                  {selectedService.credits} crédits
                </p>
                <p className="text-sm text-gray-500">
                  {selectedService.estimatedPrice.toLocaleString()} FCFA
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handlePromote}
            disabled={!selectedPromotion || isLoading || (selectedService && userCredits < selectedService.credits)}
            className="bg-gradient-to-r from-[#146B67] to-[#1FA89B] hover:from-[#146B67]/90 hover:to-[#1FA89B]/90"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                Promotion en cours...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Promouvoir maintenant
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 