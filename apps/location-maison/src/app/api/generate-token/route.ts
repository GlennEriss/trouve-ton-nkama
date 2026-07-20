import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/next-auth/auth';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.generate-token');

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const sessionUser = session?.user as { uid?: unknown } | undefined;
    const sessionUid = typeof sessionUser?.uid === 'string' ? sessionUser.uid.trim() : '';

    if (!sessionUid) {
      return jsonApiError(401, 'UNAUTHENTICATED', 'Authentification requise.');
    }

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

    if (uid !== sessionUid) {
      logger.warn('Firebase custom token UID mismatch', { sessionUid, requestedUid: uid });
      return jsonApiError(403, 'FORBIDDEN', 'Vous ne pouvez générer un jeton que pour votre compte.');
    }

    const customToken = await adminAuth.createCustomToken(sessionUid);
    return NextResponse.json({ token: customToken });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/generate-token',
      fallbackMessage: 'Impossible de générer le token.',
    });
  }
}
