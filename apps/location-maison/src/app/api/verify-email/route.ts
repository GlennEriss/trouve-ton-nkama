import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.verify-email-status');

export async function POST(request: NextRequest) {
  try {
    const { adminAuth } = await import('@/firebase/admin');
    const payload = await request.json().catch(() => null);
    const uid = typeof payload?.uid === 'string' ? payload.uid.trim() : '';

    if (!uid) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'UID utilisateur requis', {
        field: 'uid',
      });
    }

    const user = await adminAuth.getUser(uid);

    return NextResponse.json({
      success: true,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/verify-email',
      fallbackMessage: "Erreur lors de la vérification du statut de l'email.",
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
