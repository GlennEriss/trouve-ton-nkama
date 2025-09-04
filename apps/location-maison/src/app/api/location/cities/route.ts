import { NextResponse } from 'next/server';
import { collection, db, getDocs, query, where } from '@/firebase/firestore';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import redis from '@/redis/client';
import { City } from '@/models/city';

// TTL du cache (en secondes) pour les villes – configurable via REDIS_LOCATION_TTL (défaut 1800)
const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_LOCATION_TTL ?? '1800', 10);

export async function GET(request: Request) {
    const url = new URL(request.url);
    const provinceId = url.searchParams.get('provinceId');

    if (!provinceId) {
        return NextResponse.json({ error: 'Province ID is required' }, { status: 400 });
    }

    try {
        // Check if the cities are in the cache
        const cached = await redis.get<City[]>(`cities:province:${provinceId}`);

        if (Array.isArray(cached)) {
            return NextResponse.json({ cities: cached }, {
                headers: {
                    'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
                },
            });
        }

        // Fetch cities from Firestore
        const citiesRef = collection(db, firebaseCollectionNames.cities);
        const q = query(citiesRef, where("provinceId", "==", provinceId));
        const querySnapshot = await getDocs(q);
        
        const cities: City[] = [];
        querySnapshot.forEach((doc) => {
            cities.push({
                id: doc.id,
                ...doc.data()
            } as City);
        });

        // Sort cities by name
        cities.sort((a, b) => a.name.localeCompare(b.name));

        // Cache the cities
        await redis.set(`cities:province:${provinceId}`, cities, { ex: CACHE_TTL_SECONDS });

        return NextResponse.json({ cities }, {
            headers: {
                'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
            },
        });
    } catch (error) {
        console.error("Error fetching cities:", error);
        return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 });
    }
}
