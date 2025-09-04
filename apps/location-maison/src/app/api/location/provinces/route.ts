import { NextResponse } from 'next/server';
import { collection, db, getDocs } from '@/firebase/firestore';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import redis from '@/redis/client';
import { Province } from '@/models/province';

// TTL du cache (en secondes) pour les provinces – configurable via REDIS_LOCATION_TTL (défaut 1800)
const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_LOCATION_TTL ?? '1800', 10);

export async function GET() {
    try {
        // Check if the provinces are in the cache
        const cached = await redis.get<Province[]>(`provinces:all`);

        if (Array.isArray(cached)) {
            return NextResponse.json({ provinces: cached }, {
                headers: {
                    'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
                },
            });
        }

        // Fetch provinces from Firestore
        const provincesRef = collection(db, firebaseCollectionNames.provinces);
        const querySnapshot = await getDocs(provincesRef);
        
        const provinces: Province[] = [];
        querySnapshot.forEach((doc) => {
            provinces.push({
                id: doc.id,
                ...doc.data()
            } as Province);
        });

        // Sort provinces by name
        provinces.sort((a, b) => a.name.localeCompare(b.name));

        // Cache the provinces
        await redis.set(`provinces:all`, provinces, { ex: CACHE_TTL_SECONDS });

        return NextResponse.json({ provinces }, {
            headers: {
                'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
            },
        });
    } catch (error) {
        console.error("Error fetching provinces:", error);
        return NextResponse.json({ error: 'Failed to fetch provinces' }, { status: 500 });
    }
}
