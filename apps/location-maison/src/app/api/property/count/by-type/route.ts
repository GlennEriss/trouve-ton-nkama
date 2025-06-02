import { NextResponse } from 'next/server';
import { getServerCountByPropertyType } from '@/db/property.db';

// Add the in-memory cache
const propertyCountByTypeCache = new Map<string, { count: number; expiry: number }>();
const cacheDuration = 1000 * 60 * 10; // 10 minutes

export async function GET(request: Request) {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    if (!type) {
        return NextResponse.json({ error: 'Property type is required' }, { status: 400 });
    }

    // Check if the count is in the cache
    const cached = propertyCountByTypeCache.get(type);
    const now = Date.now();

    if (cached && cached.expiry > now) {
        console.log(`Serving property count for type ${type} from cache`);
        return NextResponse.json({ count: cached.count }, {
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
            },
        });
    }

    try {
        // Fetch the count from Firestore
        const count = await getServerCountByPropertyType(type);

        // Cache the count
        propertyCountByTypeCache.set(type, { count, expiry: now + cacheDuration });

        return NextResponse.json({ count }, {
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
            },
        });
    } catch (error) {
        console.error("Error fetching property count by type:", error);
        return NextResponse.json({ error: 'Failed to fetch property count' }, { status: 500 });
    }
}
