// src/hooks/use-location-search.ts
import { useQuery } from '@tanstack/react-query'

export interface PhotonResult {
  geometry: {
    coordinates: [number, number] // [longitude, latitude]
  }
  properties: {
    name: string
    city?: string
    state?: string
    country?: string
    countrycode?: string
    osm_type?: string
    osm_key?: string
    osm_value?: string
  }
}

interface SearchResponse {
  results: PhotonResult[]
  cached: boolean
  timestamp: number
  query: string
}

interface SuggestionItem {
  text: string
  type: 'autocomplete' | 'popular' | 'fallback'
  highlighted: string
}

interface SuggestionsResponse {
  suggestions: SuggestionItem[]
  query: string
  count: number
  fallback?: boolean
}

/**
 * Hook personnalisé pour la recherche de localités via notre API avec cache Redis
 * @param query - Terme de recherche
 * @param enabled - Activer/désactiver la recherche (défaut: true)
 * @returns Résultats de recherche avec états de chargement et d'erreur
 */
export function useLocationSearch(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['location-search', query],
    queryFn: async (): Promise<PhotonResult[]> => {
      if (!query.trim()) return []
      
      const searchParams = new URLSearchParams({
        q: query.trim(),
        limit: '8'
      })
      
      const response = await fetch(`/api/location/search?${searchParams}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de la recherche')
      }
      
      const data: SearchResponse = await response.json()
      return data.results
    },
    enabled: enabled && query.trim().length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Retry uniquement pour les erreurs réseau, pas les erreurs de validation
      if (error.message.includes('Paramètres invalides')) return false
      return failureCount < 2
    }
  })
}

/**
 * Hook pour les suggestions d'auto-complétion basées sur le cache Redis
 * @param query - Début du terme de recherche
 * @param enabled - Activer/désactiver les suggestions (défaut: true)
 * @returns Suggestions d'auto-complétion
 */
export function useLocationSuggestions(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['location-suggestions', query],
    queryFn: async (): Promise<SuggestionItem[]> => {
      if (!query.trim()) return []
      
      const searchParams = new URLSearchParams({
        q: query.trim(),
        limit: '8'
      })
      
      const response = await fetch(`/api/location/suggestions?${searchParams}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des suggestions')
      }
      
      const data: SuggestionsResponse = await response.json()
      return data.suggestions
    },
    enabled: enabled && query.trim().length >= 1,
    staleTime: 1000 * 60 * 2, // 2 minutes (plus court pour les suggestions)
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook pour obtenir les recherches populaires
 * @returns Liste des recherches les plus populaires
 */
export function usePopularSearches() {
  return useQuery({
    queryKey: ['popular-searches'],
    queryFn: async (): Promise<SuggestionItem[]> => {
      const response = await fetch('/api/location/suggestions?q=&limit=10')
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des recherches populaires')
      }
      
      const data: SuggestionsResponse = await response.json()
      return data.suggestions.filter(s => s.type === 'popular')
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 heure
    refetchOnWindowFocus: false,
  })
}