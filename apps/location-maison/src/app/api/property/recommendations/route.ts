import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/firebase/admin';
import { Property } from '@/models/annonce';
import redis from '@/redis/client';

// TTL pour les recommandations (en secondes)
const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CATALOG_TTL || '600', 10);

if (!adminApp) {
    throw new Error('Firebase Admin not initialized');
}

const db = getFirestore(adminApp);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limitPerPage = parseInt(searchParams.get('limit') || '6');
        const lastDocId = searchParams.get('lastDoc') || '';
        const excludeId = searchParams.get('excludeId') || '';
        const type = searchParams.get('type');
        const location = searchParams.get('location');

        // Générer une clé cache spécifique aux paramètres
        const cacheKey = `properties:recommendations:${type || 'all'}:${location || 'all'}:${excludeId || 'none'}:${limitPerPage}:${lastDocId || 'first'}`;

        // 1. Tentative de lecture cache Redis
        try {
            const cached = await redis.get<any>(cacheKey);
            if (cached) {
                return NextResponse.json(cached, {
                    headers: {
                        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
                    },
                });
            }
        } catch (err) {
            console.error('Redis GET error (recommendations):', err);
        }

/*         console.log('Search params:', { limitPerPage, lastDocId, excludeId, type, location });
 */
        // Create the base query
        let propertiesQuery = db.collection('properties')
            .where('status', '==', 'FOR_RENT')
            .orderBy('createdAt', 'desc')
            .limit(limitPerPage);

        // Add filters for type and location if provided
        if (type && type !== 'undefined') {
            propertiesQuery = propertiesQuery.where('typeProperty', '==', type);
        }

        if (location && location !== 'undefined') {
            propertiesQuery = propertiesQuery.where('province', '==', location);
        }

        /* console.log('Query filters:', { type, location }); */

        // If we have a lastDoc, start after it
        if (lastDocId) {
            const lastDocRef = await db.collection('properties').where('id', '==', lastDocId).limit(1).get();
            if (!lastDocRef.empty) {
                propertiesQuery = propertiesQuery.startAfter(lastDocRef.docs[0]);
            }
        }

        const snapshot = await propertiesQuery.get();
        /* console.log('Query results count:', snapshot.size); */

        const properties: Property[] = [];
        let lastDoc = null;

        snapshot.forEach((doc) => {
            const property = doc.data() as Property;
            console.log('Property found:', { 
                id: property.id, 
                typeProperty: property.typeProperty, 
                province: property.province 
            });
            // Exclude the current property
            if (property.id !== excludeId) {
                properties.push(property);
            }
        });

        if (!snapshot.empty) {
            lastDoc = snapshot.docs[snapshot.docs.length - 1].id;
        }

        /* console.log('Final properties count:', properties.length);
        console.log('Properties:', properties); */

        const result = {
            properties,
            lastDoc,
            hasMore: properties.length === limitPerPage,
        };

        // 2. Stockage dans Redis
        try {
            await redis.set(cacheKey, result, { ex: CACHE_TTL_SECONDS });
        } catch (err) {
            console.error('Redis SET error (recommendations):', err);
        }

        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
            },
        });
    } catch (error) {
        console.error('Error fetching recommended properties:', error);
        return NextResponse.json(
            { error: 'Failed to fetch recommended properties' },
            { status: 500 }
        );
    }
} 