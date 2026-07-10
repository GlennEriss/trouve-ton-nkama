# Stratégie de Cache pour la Carte Interactive

## Objectif

Optimiser les performances de la carte interactive en mettant en cache les résultats de recherche des logements par quartier, à la fois **côté client** et **côté serveur** (Vercel).

---

## Architecture de Cache Multi-niveaux

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ARCHITECTURE DE CACHE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Utilisateur A                     Utilisateur B                            │
│       │                                  │                                  │
│       ▼                                  ▼                                  │
│  ┌─────────────┐                    ┌─────────────┐                        │
│  │ Cache Local │                    │ Cache Local │                        │
│  │  (Client)   │                    │  (Client)   │                        │
│  │             │                    │             │                        │
│  │ Bas de Gué  │                    │  Awoungou   │                        │
│  │ Awoungou    │                    │  Ozangué    │                        │
│  └──────┬──────┘                    └──────┬──────┘                        │
│         │ miss                             │ miss                          │
│         ▼                                  ▼                                │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                     CACHE SERVEUR (Vercel)                       │       │
│  │                                                                  │       │
│  │  quartier:bas-de-gue-gue → [propriétés...]    TTL: 5min         │       │
│  │  quartier:awoungou → [propriétés...]          TTL: 5min         │       │
│  │  quartier:ozangue → [propriétés...]           TTL: 5min         │       │
│  │                                                                  │       │
│  └──────────────────────────────┬───────────────────────────────────┘       │
│                                 │ miss                                      │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                         ALGOLIA INDEX                            │       │
│  │                   (Source de vérité)                            │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Cache Côté Client (React State + Map)

### Implémentation

```typescript
// src/hooks/useQuarterPropertiesCache.ts

import { useState, useCallback, useRef } from 'react';

interface CachedResult {
  properties: Property[];
  timestamp: number;
  totalCount: number;
}

interface UseQuarterPropertiesCacheReturn {
  getFromCache: (quarterName: string) => CachedResult | null;
  setToCache: (quarterName: string, properties: Property[], totalCount: number) => void;
  isInCache: (quarterName: string) => boolean;
  clearCache: () => void;
  cacheStats: { size: number; hits: number; misses: number };
}

const CLIENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes en millisecondes
const MAX_CACHE_SIZE = 50; // Maximum 50 quartiers en cache

export function useQuarterPropertiesCache(): UseQuarterPropertiesCacheReturn {
  const cacheRef = useRef<Map<string, CachedResult>>(new Map());
  const statsRef = useRef({ hits: 0, misses: 0 });

  const normalizeKey = (quarterName: string): string => {
    return quarterName.toLowerCase().trim().replace(/\s+/g, '-');
  };

  const isExpired = (timestamp: number): boolean => {
    return Date.now() - timestamp > CLIENT_CACHE_TTL;
  };

  const getFromCache = useCallback((quarterName: string): CachedResult | null => {
    const key = normalizeKey(quarterName);
    const cached = cacheRef.current.get(key);

    if (!cached) {
      statsRef.current.misses++;
      return null;
    }

    if (isExpired(cached.timestamp)) {
      cacheRef.current.delete(key);
      statsRef.current.misses++;
      return null;
    }

    statsRef.current.hits++;
    return cached;
  }, []);

  const setToCache = useCallback((
    quarterName: string, 
    properties: Property[], 
    totalCount: number
  ): void => {
    const key = normalizeKey(quarterName);

    // Éviction LRU si cache plein
    if (cacheRef.current.size >= MAX_CACHE_SIZE) {
      const oldestKey = cacheRef.current.keys().next().value;
      if (oldestKey) cacheRef.current.delete(oldestKey);
    }

    cacheRef.current.set(key, {
      properties,
      totalCount,
      timestamp: Date.now()
    });
  }, []);

  const isInCache = useCallback((quarterName: string): boolean => {
    const key = normalizeKey(quarterName);
    const cached = cacheRef.current.get(key);
    return cached !== null && !isExpired(cached?.timestamp ?? 0);
  }, []);

  const clearCache = useCallback((): void => {
    cacheRef.current.clear();
    statsRef.current = { hits: 0, misses: 0 };
  }, []);

  return {
    getFromCache,
    setToCache,
    isInCache,
    clearCache,
    cacheStats: {
      size: cacheRef.current.size,
      ...statsRef.current
    }
  };
}
```

### Utilisation dans le composant

```typescript
// Dans MapSidebar.tsx ou le composant principal

const { getFromCache, setToCache, isInCache } = useQuarterPropertiesCache();
const [properties, setProperties] = useState<Property[]>([]);
const [isLoading, setIsLoading] = useState(false);

const handleQuarterSelect = async (quarter: OSMLocation) => {
  // 1. Vérifier le cache client d'abord
  const cached = getFromCache(quarter.name);
  
  if (cached) {
    console.log(`[Cache HIT] ${quarter.name} - ${cached.properties.length} propriétés`);
    setProperties(cached.properties);
    return;
  }

  // 2. Si pas en cache, faire la requête
  console.log(`[Cache MISS] ${quarter.name} - Requête serveur...`);
  setIsLoading(true);

  try {
    const result = await fetchPropertiesByQuarter(quarter.name);
    
    // 3. Stocker en cache pour usage futur
    setToCache(quarter.name, result.properties, result.totalCount);
    setProperties(result.properties);
  } finally {
    setIsLoading(false);
  }
};
```

---

## 2. Cache Côté Serveur (Vercel/Next.js)

### Option A : API Route avec Cache Headers

```typescript
// src/app/api/map/properties/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { searchClient } from '@/lib/algolia';

const CACHE_TTL = 300; // 5 minutes en secondes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const quarter = searchParams.get('quarter');

  if (!quarter) {
    return NextResponse.json({ error: 'Quarter parameter required' }, { status: 400 });
  }

  try {
    // Recherche Algolia
    const index = searchClient.initIndex(process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME!);
    const results = await index.search('', {
      filters: `street:"${quarter}" AND state:"IN_PROGRESS"`,
      hitsPerPage: 100,
    });

    // Créer la réponse avec headers de cache
    const response = NextResponse.json({
      quarter,
      properties: results.hits,
      totalCount: results.nbHits,
      cached: false,
      timestamp: new Date().toISOString()
    });

    // Cache-Control pour Vercel Edge Cache
    response.headers.set(
      'Cache-Control',
      `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}`
    );

    // Clé de cache basée sur le quartier
    response.headers.set('Vercel-CDN-Cache-Control', `max-age=${CACHE_TTL}`);

    return response;
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}
```

### Option B : unstable_cache de Next.js (recommandé)

```typescript
// src/lib/cached-queries.ts

import { unstable_cache } from 'next/cache';
import { searchClient } from '@/lib/algolia';

// Cache tag pour invalidation ciblée
const CACHE_TAG = 'map-properties';
const CACHE_TTL = 300; // 5 minutes

export const getCachedPropertiesByQuarter = unstable_cache(
  async (quarterName: string) => {
    console.log(`[Server] Fetching properties for: ${quarterName}`);
    
    const index = searchClient.initIndex(process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME!);
    const results = await index.search('', {
      filters: `street:"${quarterName}" AND state:"IN_PROGRESS"`,
      hitsPerPage: 100,
    });

    return {
      quarter: quarterName,
      properties: results.hits,
      totalCount: results.nbHits,
      fetchedAt: new Date().toISOString()
    };
  },
  ['map-properties'], // Cache key prefix
  {
    revalidate: CACHE_TTL,
    tags: [CACHE_TAG]
  }
);

// Pour invalider le cache d'un quartier spécifique
export async function invalidateQuarterCache(quarterName: string) {
  const { revalidateTag } = await import('next/cache');
  revalidateTag(CACHE_TAG);
}
```

### Option C : Redis/Upstash (pour cache distribué)

```typescript
// src/lib/redis-cache.ts

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const CACHE_PREFIX = 'map:quarter:';
const CACHE_TTL = 300; // 5 minutes

export async function getCachedProperties(quarterName: string) {
  const key = `${CACHE_PREFIX}${normalizeKey(quarterName)}`;
  
  const cached = await redis.get<CachedResult>(key);
  if (cached) {
    console.log(`[Redis HIT] ${quarterName}`);
    return cached;
  }
  
  return null;
}

export async function setCachedProperties(
  quarterName: string, 
  properties: Property[],
  totalCount: number
) {
  const key = `${CACHE_PREFIX}${normalizeKey(quarterName)}`;
  
  await redis.set(key, {
    properties,
    totalCount,
    timestamp: Date.now()
  }, { ex: CACHE_TTL });
  
  console.log(`[Redis SET] ${quarterName} - TTL: ${CACHE_TTL}s`);
}

function normalizeKey(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-');
}
```

---

## 3. Flux de Recherche Complet avec Cache

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUX DE RECHERCHE AVEC CACHE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Utilisateur clique sur "Bas de Gué Gué"                                   │
│                    │                                                        │
│                    ▼                                                        │
│  ┌─────────────────────────────────────────┐                               │
│  │ 1. Vérifier CACHE CLIENT (React State)  │                               │
│  │    cache.get("bas-de-gue-gue")          │                               │
│  └───────────────────┬─────────────────────┘                               │
│                      │                                                      │
│            ┌─────────┴─────────┐                                           │
│            │                   │                                           │
│        HIT ▼               MISS ▼                                          │
│  ┌──────────────┐    ┌──────────────────────────────────┐                  │
│  │ Afficher     │    │ 2. Requête API /api/map/properties │                  │
│  │ résultats    │    │    ?quarter=bas-de-gue-gue       │                  │
│  │ immédiatement│    └────────────────┬─────────────────┘                  │
│  └──────────────┘                     │                                    │
│                                       ▼                                    │
│                      ┌─────────────────────────────────────┐               │
│                      │ 3. Vérifier CACHE SERVEUR (Vercel)  │               │
│                      │    Cache-Control / unstable_cache   │               │
│                      └───────────────────┬─────────────────┘               │
│                                          │                                 │
│                                ┌─────────┴─────────┐                       │
│                                │                   │                       │
│                            HIT ▼               MISS ▼                      │
│                      ┌──────────────┐    ┌──────────────────┐              │
│                      │ Retourner    │    │ 4. Requête Algolia│              │
│                      │ données      │    │    + Stocker en  │              │
│                      │ cachées      │    │    cache serveur │              │
│                      └──────┬───────┘    └────────┬─────────┘              │
│                             │                     │                        │
│                             └──────────┬──────────┘                        │
│                                        │                                   │
│                                        ▼                                   │
│                      ┌─────────────────────────────────────┐               │
│                      │ 5. Stocker en CACHE CLIENT          │               │
│                      │    cache.set("bas-de-gue-gue", data)│               │
│                      └───────────────────┬─────────────────┘               │
│                                          │                                 │
│                                          ▼                                 │
│                      ┌─────────────────────────────────────┐               │
│                      │ 6. Afficher les résultats           │               │
│                      │    + Mettre à jour la carte         │               │
│                      └─────────────────────────────────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Provider de Cache Unifié

```typescript
// src/providers/MapCacheProvider.tsx

'use client';

import { createContext, useContext, useRef, ReactNode } from 'react';

interface CacheEntry {
  properties: Property[];
  totalCount: number;
  timestamp: number;
}

interface MapCacheContextType {
  get: (quarterName: string) => CacheEntry | null;
  set: (quarterName: string, properties: Property[], totalCount: number) => void;
  has: (quarterName: string) => boolean;
  clear: () => void;
  getAll: () => Map<string, CacheEntry>;
}

const MapCacheContext = createContext<MapCacheContextType | null>(null);

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 50;

export function MapCacheProvider({ children }: { children: ReactNode }) {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const normalize = (name: string) => name.toLowerCase().trim();

  const isExpired = (entry: CacheEntry) => 
    Date.now() - entry.timestamp > CACHE_TTL_MS;

  const get = (quarterName: string): CacheEntry | null => {
    const key = normalize(quarterName);
    const entry = cacheRef.current.get(key);
    
    if (!entry || isExpired(entry)) {
      if (entry) cacheRef.current.delete(key);
      return null;
    }
    
    return entry;
  };

  const set = (quarterName: string, properties: Property[], totalCount: number) => {
    const key = normalize(quarterName);
    
    // LRU eviction
    if (cacheRef.current.size >= MAX_ENTRIES) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey) cacheRef.current.delete(firstKey);
    }

    cacheRef.current.set(key, {
      properties,
      totalCount,
      timestamp: Date.now()
    });
  };

  const has = (quarterName: string): boolean => {
    const entry = get(quarterName);
    return entry !== null;
  };

  const clear = () => cacheRef.current.clear();

  const getAll = () => cacheRef.current;

  return (
    <MapCacheContext.Provider value={{ get, set, has, clear, getAll }}>
      {children}
    </MapCacheContext.Provider>
  );
}

export function useMapCache() {
  const context = useContext(MapCacheContext);
  if (!context) {
    throw new Error('useMapCache must be used within MapCacheProvider');
  }
  return context;
}
```

---

## 5. Configuration TTL Recommandée

| Type de cache | TTL | Raison |
|---------------|-----|--------|
| **Client (React)** | 5 min | Session utilisateur courte |
| **Serveur (Vercel CDN)** | 5 min | Données relativement fraîches |
| **stale-while-revalidate** | 10 min | UX améliorée pendant revalidation |
| **Redis (optionnel)** | 5 min | Cache distribué entre instances |

---

## 6. Invalidation du Cache

### Quand invalider ?

1. **Nouvelle propriété ajoutée** dans un quartier
2. **Propriété supprimée** ou changée de statut
3. **Manuellement** via admin

### Webhook d'invalidation (optionnel)

```typescript
// src/app/api/webhooks/property-update/route.ts

import { revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  const { quarterName, action } = await request.json();
  
  // Invalider le cache serveur pour ce quartier
  revalidateTag(`quarter:${quarterName.toLowerCase()}`);
  
  return Response.json({ invalidated: quarterName });
}
```

---

## Résumé

| Niveau | Technologie | TTL | Scope |
|--------|-------------|-----|-------|
| **Client** | React useRef/Map | 5 min | Session utilisateur |
| **CDN** | Vercel Cache-Control | 5 min | Global (tous utilisateurs) |
| **App** | Next.js unstable_cache | 5 min | Instance serveur |
| **Distribué** | Upstash Redis (optionnel) | 5 min | Multi-région |
