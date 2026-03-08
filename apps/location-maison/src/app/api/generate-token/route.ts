import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.generate-token');

export async function POST(req: NextRequest) {
  try {
    const { adminAuth } = await import('@/firebase/admin');

    const contentLength = req.headers.get('content-length');
    if (!contentLength || contentLength === '0') {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Corps de la requête requis', {
        field: 'body',
      });
    }

    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Content-Type doit être application/json', {
        field: 'content-type',
      });
    }

    let body: any;
    try {
      body = await req.json();
    } catch (error) {
      logger.warn('JSON body parsing failed', { error });
      return jsonApiError(400, 'INVALID_JSON', 'Format JSON invalide');
    }

    const uid = typeof body?.uid === 'string' ? body.uid.trim() : '';
    if (!uid) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'UID requis', {
        field: 'uid',
      });
    }

    const customToken = await adminAuth.createCustomToken(uid);
    return NextResponse.json({ token: customToken });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/generate-token',
      fallbackMessage: 'Impossible de générer le token.',
    });
  }
}
