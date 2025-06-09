import { NextResponse } from 'next/server';

// Cache pour les requêtes de géocodage
const geocodeCache = new Map<string, { data: any; expiry: number }>();
const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 heure

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    console.log('Missing coordinates:', { lat, lng });
    return NextResponse.json(
      { error: 'Latitude and longitude are required' },
      {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }

  // Vérifier le cache
  const cacheKey = `${lat},${lng}`;
  const cached = geocodeCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiry > now) {
    console.log('Serving from cache:', cacheKey);
    return NextResponse.json(cached.data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
      },
    });
  }

  try {
    console.log('Fetching from Nominatim with coordinates:', { lat, lng });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          'User-Agent': 'LocationMaison/1.0',
        },
      }
    );

    if (!response.ok) {
      console.error('Nominatim API error:', response.status);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Nominatim API response:', data);

    // Mettre en cache la réponse
    geocodeCache.set(cacheKey, { data, expiry: now + CACHE_DURATION_MS });

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching from Nominatim API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Nominatim API' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

// Gérer les requêtes OPTIONS pour CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 