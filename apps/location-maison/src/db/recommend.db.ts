import { Property } from "@/models/annonce";
import { collectionFirebaseNames } from "@/constantes";
import { createLogger } from '@/lib/logger';

const logger = createLogger('db.recommend');

const getFirestore = () => import("@/firebase/firestore");

function normalizeKitchenField<T extends Record<string, any>>(data: T): T {
    if (!data || typeof data !== 'object') {
        return data;
    }

    if ((data.nbrKitchens === undefined || data.nbrKitchens === null) && data.nbrChickens !== undefined) {
        return { ...data, nbrKitchens: data.nbrChickens } as T;
    }

    return data;
}

export async function getRecommendedProperties({
    limit = 6,
    excludeId = '',
    type,
    location
}: {
    limit?: number;
    excludeId?: string;
    type?: string;
    location?: string;
}): Promise<Property[]> {
    try {
        const { collection, getDocs, db, where, query, limit: queryLimit, orderBy } = await getFirestore();
        const propertiesRef = collection(db, collectionFirebaseNames.properties);

        // Create base query
        let q = query(
            propertiesRef,
            where('status', '==', 'FOR_RENT'),
            orderBy('createdAt', 'desc'),
            queryLimit(limit)
        );

        // Add filters for type and location if provided
        if (type && type !== 'undefined') {
            q = query(q, where('typeProperty', '==', type));
        }

        if (location && location !== 'undefined') {
            q = query(q, where('province', '==', location));
        }

        const snapshot = await getDocs(q);
        const properties: Property[] = [];

        snapshot.forEach((doc) => {
            const property = normalizeKitchenField({ ...doc.data(), id: doc.id }) as Property;
            if (property.id !== excludeId) {
                properties.push(property);
            }
        });

        return properties;
    } catch (error) {
        logger.error('Error fetching recommended properties', { error, type, location });
        throw new Error('Failed to fetch recommended properties');
    }
} 
