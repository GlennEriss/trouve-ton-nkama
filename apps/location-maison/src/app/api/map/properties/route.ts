import { NextRequest, NextResponse } from 'next/server';
import { collection, db, getDocs, query, where } from '@/firebase/firestore';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import type { Property } from '@/models/annonce';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.map.properties');

const CACHE_TTL = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const quarter = searchParams.get('quarter');
  const province = searchParams.get('province');
  const city = searchParams.get('city');

  if (!quarter) {
    return jsonApiError(400, 'VALIDATION_ERROR', 'Quarter parameter required', {
      field: 'quarter',
    });
  }

  try {
    const propertiesRef = collection(db, firebaseCollectionNames.properties);

    let q = query(
      propertiesRef,
      where('street', '==', quarter),
      where('state', '==', 'IN_PROGRESS'),
      where('moderationStatus', '==', 'APPROVED')
    );

    if (province) {
      q = query(q, where('province', '==', province));
    }
    if (city) {
      q = query(q, where('city', '==', city));
    }

    const querySnapshot = await getDocs(q);

    const properties = querySnapshot.docs.map((doc) => {
      const data = doc.data() as Property;
      return {
        objectID: doc.id,
        id: doc.id,
        title: data.title,
        name: data.title,
        price: data.price,
        area: data.area,
        street: data.street,
        city: data.city,
        province: data.province,
        latitude: data.latitude,
        longitude: data.longitude,
        images: data.images?.map((img) => (typeof img === 'string' ? img : img.fileURL)) || [],
        typeProperty: data.typeProperty,
        status: data.status,
        nbrRooms: 'nbrRooms' in data ? (data as any).nbrRooms : undefined,
        nbrBathrooms: 'nbrBathrooms' in data ? (data as any).nbrBathrooms : undefined,
      };
    });

    const response = NextResponse.json({
      quarter,
      properties,
      totalCount: properties.length,
      timestamp: new Date().toISOString(),
    });

    response.headers.set('Cache-Control', `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}`);
    response.headers.set('Vercel-CDN-Cache-Control', `max-age=${CACHE_TTL}`);

    return response;
  } catch (error) {
    logger.error('Failed to fetch map properties', { quarter, province, city, error });

    const fallbackResponse = handleApiError(error, {
      logger,
      route: '/api/map/properties',
      fallbackMessage: 'Failed to fetch properties',
    });

    if (fallbackResponse.status >= 500) {
      return NextResponse.json(
        {
          error: 'Failed to fetch properties',
          quarter,
          properties: [],
          totalCount: 0,
        },
        { status: 500 }
      );
    }

    return fallbackResponse;
  }
}
