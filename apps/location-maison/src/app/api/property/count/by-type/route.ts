import { NextResponse } from 'next/server';
import { getServerCountByPropertyType } from '@/db/property.db';
import redis from '@/redis/client';

// TTL du cache (en secondes) – configurable via REDIS_CATALOG_TTL, défaut 1800 (30 min)
const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CATALOG_TTL ?? '1800', 10);

export async function GET(request: Request) {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    if (!type) {
        return NextResponse.json({ error: 'Property type is required' }, { status: 400 });
    }

    const cacheKey = `propertyCountByType:${type}`;

    try {
        const cached = await redis.get<number>(cacheKey);

        if (typeof cached === 'number') {
            return NextResponse.json({ count: cached }, {
                headers: {
                    'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
                },
            });
        }
    } catch (error) {
        console.error('Redis GET error (property count by type):', error);
    }

    try {
        // Récupérer le comptage depuis Firestore
        const count = await getServerCountByPropertyType(type);

        // Mettre en cache le comptage
        try {
            await redis.set(cacheKey, count, { ex: CACHE_TTL_SECONDS });
        } catch (error) {
            console.error('Redis SET error (property count by type):', error);
        }

        return NextResponse.json({ count }, {
            headers: {
                'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
            },
        });
    } catch (error) {
        console.error("Error fetching property count by type:", error);
        return NextResponse.json({ error: 'Failed to fetch property count' }, { status: 500 });
    }
}
