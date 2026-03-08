// src/hooks/use-location-sync.ts
import { useEffect, useRef, useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation } from '@/hooks/use-location'
import { updateOrCreateSuggestion } from '@/db/suggestion.db'
import { createLogger } from '@/lib/logger'

const logger = createLogger('hooks.use-location-sync')

interface LocationData {
  [province: string]: {
    [city: string]: string[]
  }
}

interface SyncState {
  province: string
  city: string
  street: string
}

/**
 * Hook pour synchroniser les sélections de localité avec Firebase
 * Met à jour automatiquement le cache local et persiste les nouvelles données
 */
export function useLocationSync() {
  const { watch } = useFormContext()
  const queryClient = useQueryClient()
  const { data: locations } = useLocation()
  
  // Références pour éviter les appels redondants
  const lastSyncedRef = useRef<string>('')
  const syncTimeoutRef = useRef<NodeJS.Timeout>()
  const isSyncingRef = useRef(false)
  
  // Observer les changements des champs de localité
  const currentProvince = watch('province')
  const currentCity = watch('city')
  const currentStreet = watch('street')
  
  /**
   * Vérifier si une localité existe dans les données Firebase
   */
  const checkLocationExists = useCallback((
    province: string, 
    city: string, 
    street: string,
    data: LocationData
  ): boolean => {
    if (!data || !province || !city || !street) return true // Éviter les vérifications inutiles
    
    return !!(
      data[province] &&
      data[province][city] &&
      data[province][city].includes(street)
    )
  }, [])
  
  /**
   * Mettre à jour optimistiquement le cache React Query
   */
  const updateCacheOptimistically = useCallback((
    province: string,
    city: string,
    street: string
  ) => {
    queryClient.setQueryData(['locations'], (oldData: LocationData | undefined) => {
      if (!oldData || !province || !city || !street) return oldData
      
      // Créer une copie profonde pour éviter les mutations
      const newData = JSON.parse(JSON.stringify(oldData))
      
      // Initialiser la province si elle n'existe pas
      if (!newData[province]) {
        newData[province] = {}
      }
      
      // Initialiser la ville si elle n'existe pas
      if (!newData[province][city]) {
        newData[province][city] = []
      }
      
      // Ajouter le quartier s'il n'existe pas déjà
      if (!newData[province][city].includes(street)) {
        newData[province][city] = [...newData[province][city], street].sort((a, b) => 
          a.localeCompare(b, 'fr')
        )
      }
      
      return newData
    })
  }, [queryClient])
  
  /**
   * Persister la nouvelle localité sur Firebase
   */
  const persistToFirebase = useCallback(async (
    province: string,
    city: string,
    street: string
  ) => {
    try {
      await updateOrCreateSuggestion({ province, city, street })
      logger.info('Location synchronized to Firebase', { province, city, street })
    } catch (error) {
      logger.error('Failed to synchronize location to Firebase', { province, city, street, error })
      
      // En cas d'erreur, on peut soit :
      // 1. Rollback le cache (plus sûr)
      // 2. Garder le cache optimiste et retry plus tard
      // Ici on choisit de garder le cache pour l'UX
      
      // Optionnel : Programmer un retry
      setTimeout(() => {
        persistToFirebase(province, city, street).catch(() => {
          logger.warn('Location sync retry failed', { province, city, street })
        })
      }, 5000) // Retry dans 5 secondes
      
      throw error // Propager l'erreur pour le logging
    }
  }, [])
  
  /**
   * Fonction principale de synchronisation
   */
  const syncLocation = useCallback(async (
    province: string,
    city: string,
    street: string
  ) => {
    // Éviter les appels redondants
    const syncKey = `${province}|${city}|${street}`
    if (lastSyncedRef.current === syncKey || isSyncingRef.current) {
      return
    }
    
    // Valider les données d'entrée
    if (!province?.trim() || !city?.trim() || !street?.trim()) {
      return
    }
    
    // Vérifier si la localité existe déjà
    if (!locations || checkLocationExists(province, city, street, locations)) {
      lastSyncedRef.current = syncKey
      return
    }
    
    isSyncingRef.current = true
    lastSyncedRef.current = syncKey
    
    try {
      // 1. Mise à jour optimiste du cache
      updateCacheOptimistically(province, city, street)
      
      // 2. Persistance Firebase en arrière-plan
      await persistToFirebase(province, city, street)
      
    } catch (error) {
      logger.error('Location sync flow failed', { province, city, street, error })
    } finally {
      isSyncingRef.current = false
    }
  }, [locations, checkLocationExists, updateCacheOptimistically, persistToFirebase])
  
  /**
   * Effet principal : surveiller les changements et synchroniser
   */
  useEffect(() => {
    // Nettoyer le timeout précédent
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }
    
    // Debounce de 500ms pour éviter les appels excessifs
    syncTimeoutRef.current = setTimeout(() => {
      if (currentProvince && currentCity && currentStreet) {
        syncLocation(
          currentProvince.trim(),
          currentCity.trim(),
          currentStreet.trim()
        )
      }
    }, 500)
    
    // Cleanup
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [currentProvince, currentCity, currentStreet, syncLocation])
  
  /**
   * Fonction utilitaire pour forcer une synchronisation manuelle
   */
  const forcSync = useCallback((province: string, city: string, street: string) => {
    lastSyncedRef.current = '' // Reset pour forcer la sync
    return syncLocation(province, city, street)
  }, [syncLocation])
  
  /**
   * Fonction utilitaire pour vérifier si une localité existe
   */
  const locationExists = useCallback((province: string, city: string, street: string) => {
    return locations ? checkLocationExists(province, city, street, locations) : false
  }, [locations, checkLocationExists])
  
  return {
    // États
    isLoading: !locations,
    locations: locations || {},
    
    // Actions
    forceSync: forcSync,
    locationExists,
    
    // Informations de débogage
    lastSynced: lastSyncedRef.current,
    isSyncing: isSyncingRef.current
  }
}
