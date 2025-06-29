import { NextResponse, NextRequest } from 'next/server';
import { getSuggestions } from '@/db/suggestion.db';

// In-memory cache
const locationCache = new Map<string, { data: any; expiry: number }>();
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 1000 * 60 * 10; // 10 minutes

export async function GET(request: NextRequest) {
    const now = Date.now();
    const isCacheValid = (now - cacheTimestamp) < CACHE_DURATION_MS;
    if (isCacheValid && locationCache.get('suggestions')) {
        return NextResponse.json(locationCache, {
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
            },
        });
    }
    try {
        const suggestions = await getSuggestions();
        locationCache.set('suggestions', { data: suggestions, expiry: now + cacheTimestamp });
        return NextResponse.json(suggestions, {
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
            },
        });
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
    }
}