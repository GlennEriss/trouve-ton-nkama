import { NextResponse } from 'next/server';
import { getProperties } from '@/db/property.db';
import redis from '@/redis/client';

// TTL du cache catalogue (en secondes) – configurable via REDIS_CATALOG_TTL, défaut 600 s
const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CATALOG_TTL || '600', 10);

export async function GET(request: Request) {
    const url = new URL(request.url);
    const limitPerPage = parseInt(url.searchParams.get('limitPerPage') || '10', 10);
    const lastDoc = url.searchParams.get('lastDoc') || null;

    // Clé Redis incluant pagination (limit et lastDoc)
    const cacheKey = `properties:list:${limitPerPage}:${lastDoc ?? 'first'}`;

    // Tentative de lecture du cache Redis
    try {
        const cached = await redis.get<any>(cacheKey);
        if (cached) {
            return NextResponse.json(cached, {
                headers: {
                    'Cache-Control': `public, s-maxage=60, stale-while-revalidate=60`,
                },
            });
        }
    } catch (err) {
        console.error('Erreur Redis (GET list):', err);
    }

    try {
        // Cache manquant : récupération Firestore
        const properties = await getProperties({ limitPerPage, lastDoc });

        // Enregistrement dans Redis
        try {
            await redis.set(cacheKey, properties, { ex: CACHE_TTL_SECONDS });
        } catch (err) {
            console.error('Erreur Redis (SET list):', err);
        }

        return NextResponse.json(properties, {
            headers: {
                'Cache-Control': `public, s-maxage=60, stale-while-revalidate=60`,
            },
        });
    } catch (error) {
        console.error('Error fetching properties:', error);
        return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
    }
}
