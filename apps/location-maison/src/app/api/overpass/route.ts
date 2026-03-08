import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors/app-error';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.overpass');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function withCors(response: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get('data');

  if (!data) {
    return withCors(jsonApiError(400, 'VALIDATION_ERROR', 'Query parameter is required', { field: 'data' }));
  }

  try {
    const response = await fetch(`https://overpass-api.de/api/interpreter?data=${data}`, {
      headers: {
        'User-Agent': 'LocationMaison/1.0',
      },
    });

    if (!response.ok) {
      throw new AppError(`Overpass API error (${response.status})`, {
        code: 'OVERPASS_UPSTREAM_ERROR',
        status: 502,
        details: { status: response.status },
      });
    }

    const result = await response.json();
    return withCors(NextResponse.json(result));
  } catch (error) {
    return withCors(
      handleApiError(error, {
        logger,
        route: '/api/overpass',
        fallbackMessage: 'Failed to fetch data from Overpass API',
      })
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
