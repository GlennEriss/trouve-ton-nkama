'use client'

import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Property, PromotionType, Promotion } from '@/models/annonce'
import { useCurrentUser } from './use-current-user'
import { updateUser } from '@/db/user.db'
import { updateProperty } from '@/db/property.db'
import { routes } from '@/constantes/routes'
import { useToast } from './use-toast'
import { Timestamp } from 'firebase/firestore'
import { useSession } from 'next-auth/react'

interface UsePromotionProps {
  property: Property
  onSuccess?: () => void
}

interface PromotionServiceConfig {
  credits: number
  duration: number // en jours
}

interface PromotePropertyParams {
  promotionType: PromotionType
}

const PROMOTION_CONFIGS: Record<NonNullable<PromotionType>, PromotionServiceConfig> = {
  'featured': { credits: 15, duration: 7 },
  'trending-7d': { credits: 10, duration: 7 },
  'trending-3d': { credits: 5, duration: 3 },
  'boost': { credits: 3, duration: 0 }, // Boost n'a pas de durée, il remet juste à jour
}

export const usePromotion = ({ property, onSuccess }: UsePromotionProps) => {
  const { user, setUser } = useCurrentUser()
  const {update, data: session} = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const promoteMutation = useMutation({
    mutationFn: async ({ promotionType }: PromotePropertyParams) => {
      if (!user || !promotionType) {
        throw new Error("Utilisateur non connecté ou type de promotion invalide")
      }

      const config = PROMOTION_CONFIGS[promotionType]
      
      // Vérifier si l'utilisateur a assez de crédits
      if (!user.credits || user.credits < config.credits) {
        const error = new Error(`Crédits insuffisants. Vous avez ${user.credits || 0} crédits mais ${config.credits} sont nécessaires.`)
        error.name = 'INSUFFICIENT_CREDITS'
        throw error
      }

      // 1. Calculer les nouvelles dates
      const now = new Date()
      const startDate = Timestamp.fromDate(now)
      const endDate = config.duration > 0 
        ? Timestamp.fromDate(new Date(now.getTime() + config.duration * 24 * 60 * 60 * 1000))
        : startDate // Pour le boost, pas de date de fin

      // 2. Créer l'objet promotion
      const newPromotion: Promotion = {
        type: promotionType,
        startDate,
        endDate,
        isActive: true,
        creditsUsed: config.credits
      }

      // 3. Préparer les mises à jour
      const propertyUpdates: Partial<Property> = {
        currentPromotion: newPromotion,
        promotionHistory: [
          ...(property.promotionHistory || []),
          newPromotion
        ],
        isPromoted: true
      }

      // Pour le boost, on met aussi à jour lastBoostedAt
      if (promotionType === 'boost') {
        propertyUpdates.lastBoostedAt = startDate
      }

      // 4. Débiter les crédits de l'utilisateur
      const newCreditsBalance = user.credits - config.credits
      const userUpdateSuccess = await updateUser(user.uid, {
        credits: newCreditsBalance
      })

      if (!userUpdateSuccess) {
        throw new Error("Échec de la mise à jour des crédits utilisateur")
      }

      // 5. Mettre à jour la propriété
      const propertyUpdateSuccess = await updateProperty(property.id!, propertyUpdates)

      if (!propertyUpdateSuccess) {
        // Rollback : remettre les crédits si la mise à jour de la propriété échoue
        await updateUser(user.uid, {
          credits: user.credits
        })
        throw new Error("Échec de la mise à jour de la propriété")
      }

      // 6. Mettre à jour l'état local de l'utilisateur
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

      return { promotionType, newCreditsBalance, config }
    },
    onSuccess: (data) => {
      const { promotionType, config } = data
      
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

      // Invalider les caches liés aux propriétés promues
      queryClient.invalidateQueries({ queryKey: ['promoted-properties'] })
      queryClient.invalidateQueries({ queryKey: ['user-properties'] })
      queryClient.invalidateQueries({ queryKey: ['credit-history'] })

      onSuccess?.()
    },
    onError: (error: Error) => {
      console.error('Erreur lors de la promotion:', error)
      
      if (error.name === 'INSUFFICIENT_CREDITS') {
        toast({
          title: "Crédits insuffisants",
          description: error.message,
          variant: "destructive"
        })
        
        // Redirection séparée
        setTimeout(() => {
          router.push(routes.protected.my_balance)
        }, 2000)
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
    userCredits: user?.credits || 0,
    error: promoteMutation.error
  }
} 