import { NextResponse } from 'next/server';
import { getPropertyById } from '@/db/property.db';

// In-memory cache
const propertyCache = new Map<string, { property: any; expiry: number }>();
const cacheDuration = 1000 * 60 * 10; // 10 minutes

export async function GET(request: Request) {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }

    // Check if the property is in the cache
    const cached = propertyCache.get(id);
    const now = Date.now();

    if (cached && cached.expiry > now) {
        //console.log(`Serving property ${id} from cache`);
        return NextResponse.json(cached.property, {
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
            },
        });
    }

    try {
        // Fetch the property from Firestore
        const property = await getPropertyById(id);

        if (!property) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 });
        }

        // Cache the property
        propertyCache.set(id, { property, expiry: now + cacheDuration });

        return NextResponse.json(property, {
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
            },
        });
    } catch (error) {
        console.error("Error fetching property:", error);
        return NextResponse.json({ error: 'Failed to fetch property' }, { status: 500 });
    }
}
