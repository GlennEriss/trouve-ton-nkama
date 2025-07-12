import { NextResponse } from 'next/server'
import redis from '@/redis/client'
import { adminApp } from '@/firebase/admin'
import { getFirestore } from 'firebase-admin/firestore'
import { Property } from '@/models/annonce'

if (!adminApp) {
  throw new Error('Firebase Admin not initialized')
}

const db = getFirestore(adminApp)
const CACHE_KEY = 'properties:promoted'
const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CATALOG_TTL ?? '600', 10)

export async function GET() {
  // 1. Tentative de lecture en cache Redis
  try {
    const cached = await redis.get<any>(CACHE_KEY)
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
        },
      })
    }
  } catch (err) {
    console.error('Redis GET error (promoted):', err)
  }

  try {
    // 2. Requête Firestore pour les annonces promues
    const propertiesRef = db.collection('properties')
    const querySnap = await propertiesRef
      .where('isPromoted', '==', true)
      .orderBy('currentPromotion.startDate', 'desc')
      .limit(20)
      .get()

    const featured: Property[] = []
    const trending: Property[] = []
    const boost: Property[] = []

    const now = new Date()

    querySnap.forEach((doc) => {
      const property = { id: doc.id, ...doc.data() } as Property
      const promo: any = (property as any).currentPromotion
      if (!promo) return

      const type = promo.type as string
      const isActive = promo.isActive
      const endDate = promo.endDate ? new Date(promo.endDate.seconds * 1000) : null

      const stillValid = type === 'boost' || (isActive && endDate && endDate > now)
      if (!stillValid) return

      if (type === 'featured') featured.push(property)
      else if (type === 'boost') boost.push(property)
      else if (type === 'trending-7d' || type === 'trending-3d') trending.push(property)
    })

    const result = {
      featuredProperties: featured,
      trendingProperties: trending,
      boostProperties: boost,
    }

    // 3. Stockage en cache Redis
    try {
      await redis.set(CACHE_KEY, result, { ex: CACHE_TTL_SECONDS })
    } catch (err) {
      console.error('Redis SET error (promoted):', err)
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('Error fetching promoted properties:', error)
    return NextResponse.json({ error: 'Failed to fetch promoted properties' }, { status: 500 })
  }
} 