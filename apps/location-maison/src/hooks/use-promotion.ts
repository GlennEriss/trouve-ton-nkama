'use client'

import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Property, PromotionType } from '@/models/annonce'
import { useCurrentUser } from './use-current-user'
import { useToast } from './use-toast'
import { useSession } from 'next-auth/react'
import { createLogger } from '@/lib/logger'
import { useRecharge } from '@/providers/RechargeProvider'

const logger = createLogger('hooks.use-promotion')

interface UsePromotionProps {
  property: Property
  onSuccess?: () => void
}

interface PromotionServiceConfig {
  credits: number
  duration: number // en jours
  serviceName: string // Pour l'historique des transactions
}

interface PromotePropertyParams {
  promotionType: PromotionType
}

const PROMOTION_CONFIGS: Record<NonNullable<PromotionType>, PromotionServiceConfig> = {
  'featured': { credits: 15, duration: 7, serviceName: 'Mise à la une' },
  'trending-7d': { credits: 10, duration: 7, serviceName: 'Mise en tendance 7j' },
  'trending-3d': { credits: 5, duration: 3, serviceName: 'Mise en tendance 3j' },
  'boost': { credits: 3, duration: 0, serviceName: 'Boost' }, // Boost n'a pas de durée, il remet juste à jour
}

export const usePromotion = ({ property, onSuccess }: UsePromotionProps) => {
  const { user, setUser } = useCurrentUser()
  const {update, data: session} = useSession()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { openRecharge } = useRecharge()
  const promotionIdempotencyKeyRef = useRef<string | null>(null)

  const promoteMutation = useMutation({
    mutationFn: async ({ promotionType }: PromotePropertyParams) => {
      if (!user || !promotionType) {
        throw new Error("Utilisateur non connecté ou type de promotion invalide")
      }

      const config = PROMOTION_CONFIGS[promotionType]
      
      // Vérifier si l'utilisateur a assez de crédits
      if (!user.credits || user.credits < config.credits) {
        const error = new Error(`Crédits insuffisants. Vous avez ${user.credits ?? 0} crédits mais ${config.credits} sont nécessaires.`)
        error.name = 'INSUFFICIENT_CREDITS'
        throw error
      }

      if (!promotionIdempotencyKeyRef.current) {
        promotionIdempotencyKeyRef.current =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `promotion-${Date.now()}-${Math.random().toString(36).slice(2)}`
      }

      const response = await fetch('/api/property/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': promotionIdempotencyKeyRef.current,
        },
        body: JSON.stringify({
          idempotencyKey: promotionIdempotencyKeyRef.current,
          propertyId: property.id,
          promotionType,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        const error = new Error(payload?.message ?? "Échec de l'activation de la promotion")
        if (payload?.code === 'INSUFFICIENT_CREDITS' || response.status === 402) {
          error.name = 'INSUFFICIENT_CREDITS'
        }
        throw error
      }

      const newCreditsBalance = Number(payload.creditsRemaining ?? user.credits - config.credits)
      setUser({
        ...user,
        credits: newCreditsBalance
      })

      update({
        user: {
          ...session?.user,
          credits: newCreditsBalance
        }
      })

      return {
        promotionType,
        newCreditsBalance,
        config,
        transactionId: payload.transactionId
      }
    },
    onSuccess: (data) => {
      promotionIdempotencyKeyRef.current = null
      const { promotionType, config, transactionId } = data
      
      const promotionNames = {
        'featured': 'à la une',
        'trending-7d': 'en tendance (7 jours)',
        'trending-3d': 'en tendance (3 jours)',
        'boost': 'boostée'
      }

      toast({
        title: "Promotion activée !",
        description: `Votre annonce "${property.title}" est maintenant ${promotionNames[promotionType]}. ${config.credits} crédits ont été débités.`,
        variant: "default"
      })

      logger.info('Promotion activated', { promotionType, transactionId, propertyId: property.id })

      // Invalider les caches liés aux propriétés promues. 'announcer-ad-management' est la
      // vraie clé de /property (voir AD_QUERY_KEY dans useAdManagement.ts) — 'user-properties'
      // ne correspond à aucune query existante, cette invalidation ne servait donc à rien : la
      // carte de l'annonce restait sur son ancien badge/bouton jusqu'à un rechargement manuel.
      queryClient.invalidateQueries({ queryKey: ['promoted-properties'] })
      queryClient.invalidateQueries({ queryKey: ['announcer-ad-management'] })
      queryClient.invalidateQueries({ queryKey: ['credit-history'] })

      onSuccess?.()
    },
    onError: (error: Error) => {
      logger.error('Promotion activation failed', { error, propertyId: property.id })
      
      if (error.name === 'INSUFFICIENT_CREDITS') {
        toast({
          title: "Crédits insuffisants",
          description: `${error.message} Rechargez votre solde pour continuer.`,
          variant: "destructive"
        })

        // Ouvrir directement le flux de recharge MyPayGa
        openRecharge()
      } else {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de l'activation de la promotion. Veuillez réessayer.",
          variant: "destructive"
        })
      }
    }
  })

  const promoteProperty = (promotionType: PromotionType) => {
    promoteMutation.mutate({ promotionType })
  }

  const hasActivePromotion = () => {
    return property.currentPromotion?.isActive && 
           property.currentPromotion?.endDate && 
           new Date(property.currentPromotion.endDate.seconds * 1000) > new Date()
  }

  const canPromote = (promotionType: PromotionType) => {
    if (!user || !promotionType) return false
    
    const config = PROMOTION_CONFIGS[promotionType]
    const hasEnoughCredits = user.credits >= config.credits
    
    // Empêcher la même promotion active
    const currentType = property.currentPromotion?.type
    const isSamePromotion = hasActivePromotion() && currentType === promotionType
    
    return hasEnoughCredits && !isSamePromotion
  }

  const getPromotionStatus = () => {
    if (!hasActivePromotion()) return null
    
    const endDate = new Date(property.currentPromotion!.endDate.seconds * 1000)
    const now = new Date()
    const timeLeft = endDate.getTime() - now.getTime()
    const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000))
    
    return {
      type: property.currentPromotion!.type,
      endDate,
      daysLeft,
      isExpiringSoon: daysLeft <= 1
    }
  }
  
  return {
    promoteProperty,
    isLoading: promoteMutation.isPending,
    hasActivePromotion: hasActivePromotion(),
    canPromote,
    getPromotionStatus,
    userCredits: user?.credits ?? 0,
    error: promoteMutation.error
  }
} 
