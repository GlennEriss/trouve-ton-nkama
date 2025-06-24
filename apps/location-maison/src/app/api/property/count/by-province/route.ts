import { NextResponse } from 'next/server';
import { getServerCountByProvince } from '@/db/property.db';
import redis from '@/redis/client'

// TTL du cache (en secondes) pour les compteurs – configurable via REDIS_CATALOG_TTL (défaut 600)
const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CATALOG_TTL || '600', 10);

export async function GET(request: Request) {
    const url = new URL(request.url);
    const province = url.searchParams.get('province');

    if (!province) {
        return NextResponse.json({ error: 'Province is required' }, { status: 400 });
    }

    // Check if the count is in the cache
    const cached = await redis.get<number>(`propertyCountByProvince:${province}`);

    if (typeof cached === 'number') {
        return NextResponse.json({ count: cached }, {
            headers: {
                'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
            },
        });
    }

    try {
        // Fetch the count from Firestore
        const count = await getServerCountByProvince(province);

        // Mettre en cache le nombre
        await redis.set(`propertyCountByProvince:${province}`, count, { ex: CACHE_TTL_SECONDS });

        return NextResponse.json({ count }, {
            headers: {
                'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
            },
        });
    } catch (error) {
        console.error("Error fetching property count by province:", error);
        return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 });
    }
}
