'use client'

import { useQuery } from '@tanstack/react-query'
import { Property } from '@/models/annonce'

const getFirestore = () => import("@/firebase/firestore")

type PromotionFilter = 'featured' | 'trending' | 'boost'

interface UsePromotedPropertiesReturn {
  featuredProperties: Property[]
  trendingProperties: Property[]
  boostProperties: Property[]
  isLoading: boolean
  error: string | null
}

interface PromotedPropertiesData {
  featuredProperties: Property[]
  trendingProperties: Property[]
  boostProperties: Property[]
}

const fetchPromotedProperties = async (): Promise<PromotedPropertiesData> => {
  try {
    const { collection, getDocs, db, where, query, orderBy, limit } = await getFirestore()
    const propertiesRef = collection(db, 'properties')

    // Requête simplifiée pour les annonces promues
    const baseQuery = query(
      propertiesRef,
      where('isPromoted', '==', true),
      orderBy('currentPromotion.startDate', 'desc'),
      limit(20)
    )

    const querySnapshot = await getDocs(baseQuery)
    const allPromotedProperties: Property[] = []

    console.log('🔍 [DEBUG] Nombre de documents récupérés:', querySnapshot.size)

    querySnapshot.forEach((doc) => {
      const property = { id: doc.id, ...doc.data() } as Property
      
      console.log('🔍 [DEBUG] Propriété:', {
        id: property.id,
        title: property.title,
        isPromoted: property.isPromoted,
        currentPromotion: property.currentPromotion
      })
      
      // Vérifier que la promotion n'est pas expirée côté client
      if (property.currentPromotion?.endDate && property.currentPromotion?.isActive) {
        const endDate = new Date(property.currentPromotion.endDate.seconds * 1000)
        const now = new Date()
        
        console.log('🔍 [DEBUG] Vérification date:', {
          endDate: endDate.toISOString(),
          now: now.toISOString(),
          isValid: endDate > now
        })
        
        if (endDate > now) {
          allPromotedProperties.push(property)
        }
      } else if (property.currentPromotion?.type === 'boost') {
        // Les boost n'ont pas de date d'expiration
        allPromotedProperties.push(property)
      }
    })

    console.log('🔍 [DEBUG] Propriétés valides après filtrage:', allPromotedProperties.length)

    // Séparer par type de promotion
    const featured = allPromotedProperties.filter(p => {
      const isFeatured = p.currentPromotion?.type === 'featured'
      console.log('🔍 [DEBUG] Featured check:', { id: p.id, type: p.currentPromotion?.type, isFeatured })
      return isFeatured
    })
    
    const trending = allPromotedProperties.filter(p => {
      const isTrending = p.currentPromotion?.type === 'trending-7d' || p.currentPromotion?.type === 'trending-3d'
      console.log('🔍 [DEBUG] Trending check:', { id: p.id, type: p.currentPromotion?.type, isTrending })
      return isTrending
    })
    
    const boost = allPromotedProperties.filter(p => {
      const isBoost = p.currentPromotion?.type === 'boost'
      console.log('🔍 [DEBUG] Boost check:', { id: p.id, type: p.currentPromotion?.type, isBoost })
      return isBoost
    })

    console.log('🔍 [DEBUG] Résultats finaux:', {
      featured: featured.length,
      trending: trending.length,
      boost: boost.length
    })

    return {
      featuredProperties: featured,
      trendingProperties: trending,
      boostProperties: boost
    }

  } catch (err) {
    console.error('❌ [ERROR] Erreur lors de la récupération des annonces promues:', err)
    throw new Error('Erreur lors du chargement des annonces promues')
  }
}

export const usePromotedProperties = (filter?: PromotionFilter) => {
  const {
    data = { featuredProperties: [], trendingProperties: [], boostProperties: [] },
    isLoading,
    error
  } = useQuery({
    queryKey: ['promoted-properties'],
    queryFn: fetchPromotedProperties,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5,    // 5 minutes
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  const { featuredProperties, trendingProperties, boostProperties } = data

  // Retourner les données selon le filtre demandé
  if (filter === 'featured') {
    return { 
      featuredProperties, 
      isLoading, 
      error: error?.message || null 
    }
  }
  if (filter === 'trending') {
    return { 
      trendingProperties, 
      isLoading, 
      error: error?.message || null 
    }
  }
  if (filter === 'boost') {
    return { 
      boostProperties, 
      isLoading, 
      error: error?.message || null 
    }
  }

  // Retourner tout par défaut
  return {
    featuredProperties,
    trendingProperties,
    boostProperties,
    isLoading,
    error: error?.message || null
  } as UsePromotedPropertiesReturn
} 