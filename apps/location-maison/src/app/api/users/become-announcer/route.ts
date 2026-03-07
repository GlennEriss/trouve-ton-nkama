import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/next-auth/auth';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import { BecomeAnnouncerErrorCode } from '@/features/users/become-announcer/services';
import { becomeAnnouncerServerService } from '@/features/users/become-announcer/services/become-announcer-server.service';

const logger = createLogger('api.users.become-announcer');

function isSessionUser(value: unknown): value is { uid?: unknown } {
  return typeof value === 'object' && value !== null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const sessionUser = session?.user;
    const uid =
      isSessionUser(sessionUser) && typeof sessionUser.uid === 'string'
        ? sessionUser.uid
        : '';

    if (!uid) {
      return jsonApiError(
        401,
        BecomeAnnouncerErrorCode.UNAUTHENTICATED,
        'Authentification requise.'
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      acceptAnnouncerTerms?: unknown;
      source?: unknown;
    };

    const acceptAnnouncerTerms = body.acceptAnnouncerTerms === true;
    const source = typeof body.source === 'string' ? body.source : 'profile';

    const result = await becomeAnnouncerServerService.becomeAnnouncer({
      uid,
      acceptAnnouncerTerms,
      source,
    });

    if (!result.success) {
      return jsonApiError(
        result.error.status,
        result.error.code,
        result.error.message
      );
    }

    logger.info('Become announcer API succeeded', {
      uid,
      resultCode: result.code,
      roles: result.roles,
    });

    return NextResponse.json({
      success: true,
      code: result.code,
      roles: result.roles,
      metadata: result.metadata ?? {},
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/users/become-announcer',
      fallbackMessage: "Impossible d'activer le rôle annonceur.",
    });
  }
}
