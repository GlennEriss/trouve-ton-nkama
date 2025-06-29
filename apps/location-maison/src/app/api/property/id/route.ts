import { NextResponse } from 'next/server';
import { getPropertyById } from '@/db/property.db';
import redis from '@/redis/client';

// TTL du cache (en secondes) – configurable via variable d'env, défaut 600 s (10 min)
const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_PROPERTY_TTL ?? '600', 10);

export async function GET(request: Request) {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }

    // Vérifier la présence en cache Redis
    try {
        const cached = await redis.get(`property:${id}`);
        if (cached) {
            return NextResponse.json(cached, {
                headers: {
                    // Edge cache 60 s pour laisser Redis gérer la fraîcheur plus longue
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
                },
            });
        }
    } catch (err) {
        console.error('Erreur Redis (GET property):', err);
        // On continue sans bloquer
    }

    try {
        // Fetch the property from Firestore
        const property = await getPropertyById(id);

        if (!property) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 });
        }

        // Enregistrer dans Redis
        try {
            await redis.set(`property:${id}`, property, {
                ex: CACHE_TTL_SECONDS,
            });
        } catch (err) {
            console.error('Erreur Redis (SET property):', err);
        }

        return NextResponse.json(property, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
            },
        });
    } catch (error) {
        console.error("Error fetching property:", error);
        return NextResponse.json({ error: 'Failed to fetch property' }, { status: 500 });
    }
}
