'use client'

import { useQuery } from '@tanstack/react-query'
import { Property } from '@/models/annonce'

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
  const res = await fetch('/api/property/promoted')
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Erreur lors du chargement des annonces promues')
  }

  return data as PromotedPropertiesData
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