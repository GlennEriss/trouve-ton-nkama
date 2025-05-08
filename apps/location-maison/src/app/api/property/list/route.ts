import { NextResponse } from 'next/server';
import { getProperties } from '@/db/property.db';

// Cache variables
let propertiesCache: any;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 1000 * 60 * 10; // 10 minutes

export async function GET(request: Request) {
    const url = new URL(request.url);
    const limitPerPage = parseInt(url.searchParams.get('limitPerPage') || '10', 10);
    const lastDoc = url.searchParams.get('lastDoc') || null;

    // Check if cache is still valid
    const now = Date.now();
    const isCacheValid = (now - cacheTimestamp) < CACHE_DURATION_MS;

    if (isCacheValid && propertiesCache.properties.length > 0) {
        console.log("\n\nServing properties from cache\n\n");
        return NextResponse.json(propertiesCache, {
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
            },
        });
    }

    try {
        // Fetch fresh properties if cache is invalid
        console.log("\n\nFetching fresh properties from Firestore\n\n");
        const properties = await getProperties({ limitPerPage, lastDoc });
        
        // Update the cache
        propertiesCache = properties;
        cacheTimestamp = now;

        return NextResponse.json(properties, {
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
            },
        });
    } catch (error) {
        console.error("Error fetching properties:", error);
        return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
    }
}
