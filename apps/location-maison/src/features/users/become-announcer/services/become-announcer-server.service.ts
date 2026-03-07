import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { adminApp } from '@/firebase/admin';
import { createLogger } from '@/lib/logger';
import type { Role } from '@/models/authentication';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import {
  BecomeAnnouncerErrorCode,
  type BecomeAnnouncerSuccessCode,
} from './become-announcer.service.interface';

const logger = createLogger('users.become-announcer.service');

type BecomeAnnouncerServerInput = {
  uid: string;
  acceptAnnouncerTerms: boolean;
  source?: string;
};

type BecomeAnnouncerServerSuccess = {
  success: true;
  code: BecomeAnnouncerSuccessCode;
  roles: Role[];
  metadata?: Record<string, unknown>;
};

type BecomeAnnouncerServerError = {
  success: false;
  error: {
    code: BecomeAnnouncerErrorCode;
    message: string;
    status: number;
  };
};

export type BecomeAnnouncerServerResult =
  | BecomeAnnouncerServerSuccess
  | BecomeAnnouncerServerError;

type UserLikeRecord = Record<string, unknown> & {
  uid?: string;
  roles?: unknown;
  metadata?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sanitizeRoles(rawRoles: unknown): Role[] {
  if (!Array.isArray(rawRoles)) {
    return [];
  }

  const allowed = new Set<Role>();
  for (const role of rawRoles) {
    if (role === 'User' || role === 'Announcer' || role === 'Admin') {
      allowed.add(role);
    }
  }

  return Array.from(allowed);
}

function normalizeRolesForAnnouncerMigration(previousRoles: Role[]): Role[] {
  const nextRoles = new Set<Role>();

  nextRoles.add('User');
  for (const role of previousRoles) {
    if (role !== 'User' && role !== 'Announcer') {
      nextRoles.add(role);
    }
  }
  nextRoles.add('Announcer');

  return Array.from(nextRoles);
}

function buildError(
  code: BecomeAnnouncerErrorCode,
  message: string,
  status: number
): BecomeAnnouncerServerError {
  return {
    success: false,
    error: {
      code,
      message,
      status,
    },
  };
}

async function findUserDocumentByUid(uid: string) {
  const db = getFirestore(adminApp as any);
  const usersCollection = db.collection(firebaseCollectionNames.users);

  const directRef = usersCollection.doc(uid);
  const directSnapshot = await directRef.get();
  if (directSnapshot.exists) {
    return {
      ref: directRef,
      data: directSnapshot.data() as UserLikeRecord,
    };
  }

  const querySnapshot = await usersCollection.where('uid', '==', uid).limit(1).get();
  if (querySnapshot.empty) {
    return null;
  }

  const docSnapshot = querySnapshot.docs[0];
  return {
    ref: docSnapshot.ref,
    data: docSnapshot.data() as UserLikeRecord,
  };
}

class BecomeAnnouncerServerService {
  async becomeAnnouncer(input: BecomeAnnouncerServerInput): Promise<BecomeAnnouncerServerResult> {
    const uid = input.uid.trim();
    const source = input.source?.trim() || 'profile';

    logger.info('Become announcer requested', {
      uid,
      source,
      acceptAnnouncerTerms: input.acceptAnnouncerTerms,
    });

    if (!uid) {
      return buildError(
        BecomeAnnouncerErrorCode.UNAUTHENTICATED,
        'Session utilisateur invalide.',
        401
      );
    }

    if (!input.acceptAnnouncerTerms) {
      return buildError(
        BecomeAnnouncerErrorCode.ANNOUNCER_TERMS_REQUIRED,
        "Vous devez accepter les conditions d'annonceur.",
        400
      );
    }

    try {
      const userDocument = await findUserDocumentByUid(uid);
      if (!userDocument) {
        logger.warn('Become announcer failed: user not found', { uid });
        return buildError(
          BecomeAnnouncerErrorCode.USER_NOT_FOUND,
          'Compte utilisateur introuvable.',
          404
        );
      }

      const previousRoles = sanitizeRoles(userDocument.data.roles);
      if (!previousRoles.includes('User')) {
        logger.warn('Become announcer blocked: forbidden role state', {
          uid,
          oldRoles: previousRoles,
        });
        return buildError(
          BecomeAnnouncerErrorCode.FORBIDDEN_ROLE_STATE,
          "Seuls les comptes avec le rôle 'User' peuvent devenir annonceur.",
          403
        );
      }

      const currentMetadata = isRecord(userDocument.data.metadata)
        ? userDocument.data.metadata
        : {};

      if (previousRoles.includes('Announcer')) {
        logger.info('Become announcer skipped: already announcer', {
          uid,
          oldRoles: previousRoles,
          newRoles: previousRoles,
          resultCode: 'ALREADY_ANNOUNCER',
        });
        return {
          success: true,
          code: 'ALREADY_ANNOUNCER',
          roles: previousRoles,
          metadata: currentMetadata,
        };
      }

      const nextRoles = normalizeRolesForAnnouncerMigration(previousRoles);
      const nowIso = new Date().toISOString();
      const nextMetadata: Record<string, unknown> = {
        ...currentMetadata,
        becomeAnnouncerAt: nowIso,
        becomeAnnouncerSource: source,
      };

      await userDocument.ref.update({
        roles: nextRoles,
        metadata: nextMetadata,
        updatedAt: FieldValue.serverTimestamp(),
      });

      logger.info('Become announcer succeeded', {
        uid,
        oldRoles: previousRoles,
        newRoles: nextRoles,
        resultCode: 'BECOME_ANNOUNCER_SUCCESS',
      });

      return {
        success: true,
        code: 'BECOME_ANNOUNCER_SUCCESS',
        roles: nextRoles,
        metadata: nextMetadata,
      };
    } catch (error) {
      logger.error('Become announcer persistence failed', {
        uid,
        error,
        resultCode: BecomeAnnouncerErrorCode.PERSISTENCE_ERROR,
      });
      return buildError(
        BecomeAnnouncerErrorCode.PERSISTENCE_ERROR,
        "Impossible d'activer le rôle annonceur pour le moment.",
        500
      );
    }
  }
}

export const becomeAnnouncerServerService = new BecomeAnnouncerServerService();
