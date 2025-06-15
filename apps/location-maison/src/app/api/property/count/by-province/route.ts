import { NextResponse } from 'next/server';
import { getServerCountByProvince } from '@/db/property.db';

// Add the in-memory cache
const propertyCountByProvinceCache = new Map<string, { count: number; expiry: number }>();
const cacheDuration = 1000 * 60 * 10; // 10 minutes

export async function GET(request: Request) {
    const url = new URL(request.url);
    const province = url.searchParams.get('province');

    if (!province) {
        return NextResponse.json({ error: 'Province is required' }, { status: 400 });
    }

    // Check if the count is in the cache
    const cached = propertyCountByProvinceCache.get(province);
    const now = Date.now();

    if (cached && cached.expiry > now) {
        //console.log(`Serving property count for province ${province} from cache`);
        return NextResponse.json({ count: cached.count }, {
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
            },
        });
    }

    try {
        // Fetch the count from Firestore
        const count = await getServerCountByProvince(province);

        // Cache the count
        propertyCountByProvinceCache.set(province, { count, expiry: now + cacheDuration });

        return NextResponse.json({ count }, {
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
            },
        });
    } catch (error) {
        console.error("Error fetching property count by province:", error);
        return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 });
    }
}
