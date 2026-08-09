import { NextResponse } from 'next/server';

import { auth } from '@/next-auth/auth';
import { createLogger } from '@/lib/logger';
import { userRepository } from '@/features/auth/repositories/user.repository';

const logger = createLogger('api.announcer.claim-notice.dismiss');

/**
 * Clears the one-shot `metadata.pendingClaimNotice` flag set after an
 * auto-attribution (see phone-auth.service.ts) once the announcer's dashboard
 * has shown the welcome banner, so it doesn't reappear on next login/refresh.
 */
export async function POST() {
  const session = await auth();
  const uid = session?.user?.uid;
  if (!uid) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentification requise.' } },
      { status: 401 },
    );
  }

  try {
    const user = await userRepository.findById(uid);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable.' } },
        { status: 404 },
      );
    }

    const { pendingClaimNotice: _pendingClaimNotice, ...restMetadata } = (user.metadata ?? {}) as Record<string, unknown>;
    const updated = await userRepository.update(uid, { metadata: restMetadata });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    logger.error('Failed to dismiss pending claim notice', { uid, error });
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Impossible de mettre à jour la notification.' } },
      { status: 500 },
    );
  }
}
