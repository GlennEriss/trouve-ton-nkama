import { NextResponse } from 'next/server';
import { getServerCountByPropertyType } from '@/db/property.db';

// Cache pour les comptages de propriétés
const propertyCountByTypeCache = new Map<string, { count: number; expiry: number }>();
const CACHE_DURATION_MS = 1000 * 60 * 30; // 30 minutes

export async function GET(request: Request) {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    if (!type) {
        return NextResponse.json({ error: 'Property type is required' }, { status: 400 });
    }

    // Vérifier le cache
    const cached = propertyCountByTypeCache.get(type);
    const now = Date.now();

    if (cached && cached.expiry > now) {
        //console.log(`Serving property count for type ${type} from cache`);
        return NextResponse.json({ count: cached.count }, {
            headers: {
                'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=1800',
            },
        });
    }

    try {
        // Récupérer le comptage depuis Firestore
        const count = await getServerCountByPropertyType(type);

        // Mettre en cache le comptage
        propertyCountByTypeCache.set(type, { count, expiry: now + CACHE_DURATION_MS });

        return NextResponse.json({ count }, {
            headers: {
                'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=1800',
            },
        });
    } catch (error) {
        console.error("Error fetching property count by type:", error);
        return NextResponse.json({ error: 'Failed to fetch property count' }, { status: 500 });
    }
}
