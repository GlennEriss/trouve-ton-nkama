import { NextResponse } from 'next/server';
import { collection, db, getDocs, query, where } from '@/firebase/firestore';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import redis from '@/redis/client';
import { Street } from '@/models/street';

// TTL du cache (en secondes) pour les rues – configurable via REDIS_LOCATION_TTL (défaut 1800)
const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_LOCATION_TTL ?? '1800', 10);

export async function GET(request: Request) {
    const url = new URL(request.url);
    const cityId = url.searchParams.get('cityId');

    if (!cityId) {
        return NextResponse.json({ error: 'City ID is required' }, { status: 400 });
    }

    try {
        // Check if the streets are in the cache
        const cached = await redis.get<Street[]>(`streets:city:${cityId}`);

        if (Array.isArray(cached)) {
            return NextResponse.json({ streets: cached }, {
                headers: {
                    'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
                },
            });
        }

        // Fetch streets from Firestore
        const streetsRef = collection(db, firebaseCollectionNames.streets);
        const q = query(streetsRef, where("cityId", "==", cityId));
        const querySnapshot = await getDocs(q);
        
        const streets: Street[] = [];
        querySnapshot.forEach((doc) => {
            streets.push({
                id: doc.id,
                ...doc.data()
            } as Street);
        });

        // Sort streets by name
        streets.sort((a, b) => a.name.localeCompare(b.name));

        // Cache the streets
        await redis.set(`streets:city:${cityId}`, streets, { ex: CACHE_TTL_SECONDS });

        return NextResponse.json({ streets }, {
            headers: {
                'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
            },
        });
    } catch (error) {
        console.error("Error fetching streets:", error);
        return NextResponse.json({ error: 'Failed to fetch streets' }, { status: 500 });
    }
}
