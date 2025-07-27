// src/app/api/location/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import redis from '@/redis/client'
import { z } from 'zod'

// Schéma de validation pour les paramètres de recherche
const searchParamsSchema = z.object({
  q: z.string().min(2, 'La recherche doit contenir au moins 2 caractères').max(100),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 8)
})

// Types pour les résultats Photon
interface PhotonResult {
  geometry: {
    coordinates: [number, number]
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

interface PhotonResponse {
  features: PhotonResult[]
}

interface CachedSearchResult {
  results: PhotonResult[]
  timestamp: number
  query: string
}

// Configuration Redis
const REDIS_KEYS = {
  SEARCH_CACHE: (query: string) => `photon:search:${query.toLowerCase()}`,
  AUTOCOMPLETE: 'gabon:autocomplete',
  POPULAR_SEARCHES: 'gabon:popular',
  SEARCH_COUNT: (query: string) => `search:count:${query.toLowerCase()}`
} as const

const CACHE_TTL = 7 * 24 * 60 * 60 // 7 jours en secondes
const POPULAR_SEARCHES_LIMIT = 50

// Fonction pour appeler l'API Photon
async function fetchFromPhoton(query: string, limit: number = 8): Promise<PhotonResult[]> {
  const searchQuery = `${query.trim()} Gabon`
  
  try {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&lat=0.7&lon=11.5&limit=${limit}`,
      {
        headers: {
          'User-Agent': 'Location-Search-App/1.0'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`Photon API error: ${response.status}`)
    }
    
    const data: PhotonResponse = await response.json()
    
    // Filtrer pour le Gabon uniquement et nettoyer les données
    return data.features
      .filter(feature => 
        feature.properties.countrycode === 'ga' ||
        feature.properties.country?.toLowerCase().includes('gabon')
      )
      .map(feature => ({
        geometry: feature.geometry,
        properties: {
          name: feature.properties.name?.trim() || '',
          city: feature.properties.city?.trim(),
          state: feature.properties.state?.trim(),
          country: feature.properties.country?.trim(),
          countrycode: feature.properties.countrycode?.toLowerCase(),
          osm_type: feature.properties.osm_type,
          osm_key: feature.properties.osm_key,
          osm_value: feature.properties.osm_value
        }
      }))
      .filter(feature => feature.properties.name) // Éliminer les résultats sans nom
    
  } catch (error) {
    console.error('Erreur lors de l\'appel à Photon:', error)
    throw new Error('Service de géolocalisation temporairement indisponible')
  }
}

// Fonction pour mettre à jour les suggestions d'auto-complétion
async function updateAutocomplete(query: string, results: PhotonResult[]) {
  try {
    // Ajouter la recherche aux suggestions d'auto-complétion
    await redis.zadd(REDIS_KEYS.AUTOCOMPLETE, {
      score: Date.now(),
      member: query.toLowerCase()
    })
    
    // Limiter le nombre de suggestions stockées (garder les 1000 plus récentes)
    await redis.zremrangebyrank(REDIS_KEYS.AUTOCOMPLETE, 0, -1001)
    
    // Ajouter les noms de lieux trouvés pour enrichir l'auto-complétion
    const locationNames = results
      .map(r => r.properties.name?.toLowerCase())
      .filter(Boolean)
    
    if (locationNames.length > 0) {
      const members = locationNames.map(name => ({
        score: Date.now(),
        member: name
      }))
      
      for (const member of members) {
        await redis.zadd(REDIS_KEYS.AUTOCOMPLETE, member)
      }
    }
    
  } catch (error) {
    console.warn('Erreur lors de la mise à jour de l\'auto-complétion:', error)
    // Ne pas faire échouer la recherche pour autant
  }
}

// Fonction pour suivre la popularité des recherches
async function trackSearchPopularity(query: string) {
  try {
    await redis.zincrby(REDIS_KEYS.POPULAR_SEARCHES, 1, query.toLowerCase())
    
    // Garder seulement les top recherches
    await redis.zremrangebyrank(REDIS_KEYS.POPULAR_SEARCHES, 0, -(POPULAR_SEARCHES_LIMIT + 1))
    
  } catch (error) {
    console.warn('Erreur lors du tracking de popularité:', error)
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validation des paramètres
    const { searchParams } = new URL(request.url)
    const validation = searchParamsSchema.safeParse({
      q: searchParams.get('q'),
      limit: searchParams.get('limit')
    })
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Paramètres invalides', details: validation.error.issues },
        { status: 400 }
      )
    }
    
    const { q: query, limit } = validation.data
    const normalizedQuery = query.toLowerCase().trim()
    const cacheKey = REDIS_KEYS.SEARCH_CACHE(normalizedQuery)
    
    // 1. Vérifier le cache Redis
    try {
      const cachedResult = await redis.get(cacheKey)
      
      if (cachedResult) {
        const parsed: CachedSearchResult = JSON.parse(cachedResult as string)
        
        // Incrémenter le compteur de popularité
        await trackSearchPopularity(normalizedQuery)
        
        return NextResponse.json({
          results: parsed.results,
          cached: true,
          timestamp: parsed.timestamp,
          query: parsed.query
        })
      }
    } catch (redisError) {
      console.warn('Erreur Redis lors de la lecture du cache:', redisError)
      // Continuer sans cache
    }
    
    // 2. Cache miss - Appeler Photon
    const results = await fetchFromPhoton(query, limit)
    
    // 3. Mettre en cache le résultat
    const cacheData: CachedSearchResult = {
      results,
      timestamp: Date.now(),
      query: normalizedQuery
    }
    
    try {
      // Stocker dans Redis avec TTL
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(cacheData))
      
      // Mettre à jour l'auto-complétion et la popularité en parallèle
      await Promise.all([
        updateAutocomplete(normalizedQuery, results),
        trackSearchPopularity(normalizedQuery)
      ])
      
    } catch (redisError) {
      console.warn('Erreur Redis lors de la mise en cache:', redisError)
      // Retourner les résultats même si le cache échoue
    }
    
    return NextResponse.json({
      results,
      cached: false,
      timestamp: Date.now(),
      query: normalizedQuery
    })
    
  } catch (error) {
    console.error('Erreur dans l\'API de recherche:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
        results: [],
        cached: false
      },
      { status: 500 }
    )
  }
}

// Optionnel : Support de la méthode POST pour des recherches plus complexes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = searchParamsSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.issues },
        { status: 400 }
      )
    }
    
    // Rediriger vers la logique GET
    const searchParams = new URLSearchParams({
      q: validation.data.q,
      limit: validation.data.limit.toString()
    })
    const url = new URL(`${request.url}?${searchParams}`)
    const newRequest = new NextRequest(url, { method: 'GET' })
    
    return GET(newRequest)
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors du parsing de la requête' },
      { status: 400 }
    )
  }
}