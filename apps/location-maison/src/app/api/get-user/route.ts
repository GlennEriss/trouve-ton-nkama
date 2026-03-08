import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.get-user');

export async function POST(req: NextRequest) {
  try {
    const { adminAuth } = await import('@/firebase/admin');
    const payload = await req.json().catch(() => null);
    const uid = typeof payload?.uid === 'string' ? payload.uid.trim() : '';

    if (!uid) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Le UID est requis.', {
        field: 'uid',
      });
    }

    const user = await adminAuth.getUser(uid);
    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/get-user',
      fallbackMessage: "Erreur lors de la récupération de l'utilisateur.",
      knownCodes: {
        'auth/user-not-found': {
          status: 404,
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé.',
        },
      },
    });
  }
}
