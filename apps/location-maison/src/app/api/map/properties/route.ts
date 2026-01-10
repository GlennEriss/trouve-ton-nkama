import { NextRequest, NextResponse } from 'next/server';
import { collection, db, getDocs, query, where } from '@/firebase/firestore';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import type { Property } from '@/models/annonce';

// TTL du cache (5 minutes)
const CACHE_TTL = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const quarter = searchParams.get('quarter');
  const province = searchParams.get('province');
  const city = searchParams.get('city');

  // Le paramètre quarter (street) est requis
  if (!quarter) {
    return NextResponse.json(
      { error: 'Quarter parameter required' }, 
      { status: 400 }
    );
  }

  try {
    // Construire la requête Firestore
    const propertiesRef = collection(db, firebaseCollectionNames.properties);
    
    // Créer la requête avec les conditions (Firestore combine automatiquement avec AND)
    let q = query(
      propertiesRef,
      where('street', '==', quarter),
      where('state', '==', 'IN_PROGRESS')
    );

    // Ajouter les filtres optionnels pour province et city si fournis
    if (province) {
      q = query(q, where('province', '==', province));
    }
    if (city) {
      q = query(q, where('city', '==', city));
    }
    
    // Exécuter la requête
    const querySnapshot = await getDocs(q);

    // Transformer les résultats au format attendu
    const properties = querySnapshot.docs.map((doc) => {
      const data = doc.data() as Property;
      return {
        objectID: doc.id, // Pour compatibilité avec Algolia
        id: doc.id,
        title: data.title,
        name: data.title, // Fallback pour name
        price: data.price,
        area: data.area,
        street: data.street,
        city: data.city,
        province: data.province,
        latitude: data.latitude,
        longitude: data.longitude,
        images: data.images?.map(img => typeof img === 'string' ? img : img.fileURL) || [],
        typeProperty: data.typeProperty,
        status: data.status,
        nbrRooms: 'nbrRooms' in data ? (data as any).nbrRooms : undefined,
        nbrBathrooms: 'nbrBathrooms' in data ? (data as any).nbrBathrooms : undefined,
      };
    });

    // Créer la réponse avec headers de cache
    const response = NextResponse.json({
      quarter,
      properties,
      totalCount: properties.length,
      timestamp: new Date().toISOString()
    });

    // Cache-Control pour Vercel Edge Cache
    // s-maxage: cache CDN de 5 minutes
    // stale-while-revalidate: servir le cache périmé pendant 10 min pendant la revalidation
    response.headers.set(
      'Cache-Control',
      `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}`
    );

    // Header spécifique Vercel pour le cache CDN
    response.headers.set('Vercel-CDN-Cache-Control', `max-age=${CACHE_TTL}`);

    return response;
  } catch (error) {
    console.error('Error fetching properties from Firestore:', quarter, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch properties',
        quarter,
        properties: [],
        totalCount: 0
      }, 
      { status: 500 }
    );
  }
}
