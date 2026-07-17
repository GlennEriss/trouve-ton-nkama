import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { adminApp, adminAuth } from '@/firebase/admin';
import { createLogger } from '@/lib/logger';
import type { Role } from '@/models/authentication';
import type { Reel } from '@/models/reel';

export const runtime = 'nodejs';

const logger = createLogger('api.reels');

type ReelApiResponse = {
  success: boolean;
  reelId?: string;
  message: string;
  code?: string;
};

class ReelApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ReelApiError';
  }
}

function jsonResponse(payload: ReelApiResponse, status = 200) {
  return NextResponse.json(payload, { status });
}

function jsonError(error: ReelApiError) {
  return jsonResponse(
    {
      success: false,
      code: error.code,
      message: error.message,
    },
    error.status
  );
}

function getAdminDb(): FirebaseFirestore.Firestore {
  if (!adminApp) {
    throw new ReelApiError(500, 'FIREBASE_ADMIN_UNAVAILABLE', 'Firebase admin non initialisé.');
  }

  return getFirestore(adminApp);
}

function getStoragePathsFromReel(reel: Record<string, unknown>): string[] {
  return [reel.rawVideoPath, reel.videoPath, reel.thumbnailPath]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());
}

async function deleteStorageObjects(paths: string[]) {
  if (paths.length === 0) return;

  if (!adminApp) {
    logger.warn('Reel storage cleanup skipped because Firebase admin is unavailable', {
      pathCount: paths.length,
    });
    return;
  }

  const uniquePaths = Array.from(new Set(paths));
  try {
    const storage = getStorage(adminApp);
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
    const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
    const results = await Promise.allSettled(
      uniquePaths.map((path) => bucket.file(path).delete({ ignoreNotFound: true }))
    );

    const failed = results
      .map((result, index) => ({ result, path: uniquePaths[index] }))
      .filter(({ result }) => result.status === 'rejected');

    if (failed.length > 0) {
      logger.warn('Some reel storage objects could not be deleted', {
        paths: failed.map(({ path }) => path),
      });
    }
  } catch (error) {
    logger.warn('Reel storage cleanup skipped after Firestore deletion', {
      error,
      pathCount: uniquePaths.length,
    });
  }
}

function readBearerToken(request: NextRequest): string {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new ReelApiError(401, 'UNAUTHENTICATED', "Token d'authentification requis.");
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    throw new ReelApiError(401, 'UNAUTHENTICATED', "Token d'authentification requis.");
  }

  return token;
}

async function authenticateRequest(request: NextRequest): Promise<string> {
  try {
    const decoded = await adminAuth.verifyIdToken(readBearerToken(request));
    return decoded.uid;
  } catch (error) {
    if (error instanceof ReelApiError) {
      throw error;
    }
    throw new ReelApiError(401, 'INVALID_TOKEN', "Session invalide. Reconnectez-vous puis réessayez.");
  }
}

async function readJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ReelApiError(400, 'INVALID_BODY', 'Requête invalide.');
  }
  return body as Record<string, unknown>;
}

function sanitizeDocId(value: unknown, fieldName: string): string {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!id || id === '.' || id === '..' || id.includes('/') || id.length > 512) {
    throw new ReelApiError(400, 'INVALID_ID', `${fieldName} invalide.`);
  }
  return id;
}

function sanitizeOptionalPropertyId(value: unknown): string | null {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  const propertyId = typeof value === 'string' ? value.trim() : '';
  if (!propertyId) {
    return null;
  }

  return sanitizeDocId(propertyId, 'Annonce');
}

function sanitizeOptionalContact(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const contact = value.trim();
  if (!contact) {
    return undefined;
  }

  if (contact.length > 80) {
    throw new ReelApiError(400, 'INVALID_CONTACT', 'Le numéro de contact est trop long.');
  }

  return contact;
}

function sanitizeOptionalDescription(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const description = value.trim();
  if (!description) {
    return undefined;
  }

  if (description.length > 280) {
    throw new ReelApiError(400, 'INVALID_DESCRIPTION', 'La description ne peut pas dépasser 280 caractères.');
  }

  return description;
}

function sanitizeEditableContact(value: unknown): string | null {
  if (typeof value !== 'string') {
    throw new ReelApiError(400, 'INVALID_CONTACT', 'Le numéro de contact est invalide.');
  }

  const contact = value.trim();
  if (!contact) {
    return null;
  }

  if (contact.length > 80) {
    throw new ReelApiError(400, 'INVALID_CONTACT', 'Le numéro de contact est trop long.');
  }

  return contact;
}

function sanitizeEditableDescription(value: unknown): string | null {
  if (typeof value !== 'string') {
    throw new ReelApiError(400, 'INVALID_DESCRIPTION', 'La description est invalide.');
  }

  const description = value.trim();
  if (!description) {
    return null;
  }

  if (description.length > 280) {
    throw new ReelApiError(400, 'INVALID_DESCRIPTION', 'La description ne peut pas dépasser 280 caractères.');
  }

  return description;
}

function sanitizeProcessingError(value: unknown): string {
  const fallback = "L'envoi de la vidéo a échoué. Réessayez avec un autre fichier.";
  if (typeof value !== 'string') {
    return fallback;
  }

  const message = value.trim();
  if (!message) {
    return fallback;
  }

  return message.length > 180 ? `${message.slice(0, 177)}...` : message;
}

function sanitizeOptionalTrimSeconds(value: unknown, fieldName: string): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  if (value < 0 || value > 3600) {
    throw new ReelApiError(400, 'INVALID_TRIM', `${fieldName} invalide.`);
  }

  return value;
}

function sanitizeOptionalMuted(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function sanitizeRawVideoPath(value: unknown, uid: string, reelId: string): string {
  const rawVideoPath = typeof value === 'string' ? value.trim() : '';
  const expectedPrefix = `reels-raw/${uid}/${reelId}.`;

  if (
    !rawVideoPath.startsWith(expectedPrefix) ||
    rawVideoPath.includes('..') ||
    rawVideoPath.split('/').length !== 3
  ) {
    throw new ReelApiError(400, 'INVALID_RAW_VIDEO_PATH', 'Chemin vidéo invalide.');
  }

  return rawVideoPath;
}

function sanitizeRoles(rawRoles: unknown): Role[] {
  if (!Array.isArray(rawRoles)) {
    return [];
  }

  return rawRoles.filter((role): role is Role =>
    role === 'Admin' || role === 'User' || role === 'Announcer'
  );
}

async function findUserDocumentByUid(
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData> | null> {
  const directSnapshot = await db.collection(firebaseCollectionNames.users).doc(uid).get();
  if (directSnapshot.exists) {
    return directSnapshot;
  }

  const querySnapshot = await db
    .collection(firebaseCollectionNames.users)
    .where('uid', '==', uid)
    .limit(1)
    .get();

  if (querySnapshot.empty) {
    return null;
  }

  return querySnapshot.docs[0];
}

async function assertAnnouncer(db: FirebaseFirestore.Firestore, uid: string) {
  const userSnapshot = await findUserDocumentByUid(db, uid);
  if (!userSnapshot?.exists) {
    throw new ReelApiError(404, 'USER_NOT_FOUND', 'Profil utilisateur introuvable.');
  }

  const roles = sanitizeRoles(userSnapshot.data()?.roles);
  if (!roles.includes('Announcer')) {
    throw new ReelApiError(403, 'ANNOUNCER_REQUIRED', 'Compte annonceur requis pour créer un réel.');
  }
}

async function assertOwnedProperty(
  transaction: FirebaseFirestore.Transaction,
  propertyRef: FirebaseFirestore.DocumentReference,
  uid: string
) {
  const propertySnapshot = await transaction.get(propertyRef);
  if (!propertySnapshot.exists) {
    throw new ReelApiError(404, 'PROPERTY_NOT_FOUND', 'Annonce introuvable.');
  }

  const property = propertySnapshot.data() ?? {};
  if (property.createdBy !== uid) {
    throw new ReelApiError(403, 'FORBIDDEN_PROPERTY', "Cette annonce ne vous appartient pas.");
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ReelApiResponse>> {
  try {
    const uid = await authenticateRequest(request);
    const body = await readJsonBody(request);
    const reelId = sanitizeDocId(body.reelId, 'Reel ID');
    const propertyId = sanitizeOptionalPropertyId(body.propertyId);
    const rawVideoPath = sanitizeRawVideoPath(body.rawVideoPath, uid, reelId);
    const contact = sanitizeOptionalContact(body.contact);
    const description = sanitizeOptionalDescription(body.description);
    const trimStartSeconds = sanitizeOptionalTrimSeconds(body.trimStartSeconds, 'Début du montage');
    const trimEndSeconds = sanitizeOptionalTrimSeconds(body.trimEndSeconds, 'Fin du montage');
    if (
      typeof trimStartSeconds === 'number' &&
      typeof trimEndSeconds === 'number' &&
      trimEndSeconds <= trimStartSeconds
    ) {
      throw new ReelApiError(400, 'INVALID_TRIM_RANGE', 'La fin du montage doit être après le début.');
    }
    const muted = sanitizeOptionalMuted(body.muted);

    const db = getAdminDb();
    await assertAnnouncer(db, uid);

    const reelRef = db.collection(firebaseCollectionNames.reels).doc(reelId);
    const propertyRef = propertyId
      ? db.collection(firebaseCollectionNames.properties).doc(propertyId)
      : null;

    await db.runTransaction(async (transaction) => {
      const reelSnapshot = await transaction.get(reelRef);
      if (reelSnapshot.exists) {
        throw new ReelApiError(409, 'REEL_ALREADY_EXISTS', 'Ce réel existe déjà.');
      }

      if (propertyRef) {
        await assertOwnedProperty(transaction, propertyRef, uid);
      }

      const payload: Reel & { state: 'IN_PROGRESS'; createdAt: FirebaseFirestore.FieldValue; updatedAt: FirebaseFirestore.FieldValue } = {
        propertyId,
        createdBy: uid,
        processingStatus: 'uploading',
        rawVideoPath,
        moderationStatus: 'PENDING',
        viewCount: 0,
        likeCount: 0,
        shareCount: 0,
        giftCount: 0,
        giftTotalAmount: 0,
        state: 'IN_PROGRESS',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        ...(contact ? { contact } : {}),
        ...(description ? { description } : {}),
        ...(typeof trimStartSeconds === 'number' ? { trimStartSeconds } : {}),
        ...(typeof trimEndSeconds === 'number' ? { trimEndSeconds } : {}),
        ...(typeof muted === 'boolean' ? { muted } : {}),
      } as Reel & { state: 'IN_PROGRESS'; createdAt: FirebaseFirestore.FieldValue; updatedAt: FirebaseFirestore.FieldValue };

      transaction.create(reelRef, payload);
    });

    logger.info('Reel created', {
      uid,
      reelId,
      hasProperty: Boolean(propertyId),
    });

    return jsonResponse({
      success: true,
      reelId,
      message: 'Réel créé avec succès.',
    });
  } catch (error) {
    if (error instanceof ReelApiError) {
      logger.warn('Reel creation rejected', {
        code: error.code,
        status: error.status,
        message: error.message,
      });
      return jsonError(error);
    }

    logger.error('Reel creation failed', { error });
    return jsonResponse(
      {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la création du réel.',
      },
      500
    );
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse<ReelApiResponse>> {
  try {
    const uid = await authenticateRequest(request);
    const body = await readJsonBody(request);
    const action = body.action;
    if (
      action !== 'mark-upload-failed' &&
      action !== 'attach-property' &&
      action !== 'update-details'
    ) {
      throw new ReelApiError(400, 'INVALID_ACTION', 'Action de modification invalide.');
    }
    const reelId = sanitizeDocId(body.reelId, 'Reel ID');

    const db = getAdminDb();
    const reelRef = db.collection(firebaseCollectionNames.reels).doc(reelId);

    if (action === 'mark-upload-failed') {
      const processingError = sanitizeProcessingError(body.processingError);

      await db.runTransaction(async (transaction) => {
        const reelSnapshot = await transaction.get(reelRef);
        if (!reelSnapshot.exists) {
          throw new ReelApiError(404, 'REEL_NOT_FOUND', 'Réel introuvable.');
        }

        const reel = reelSnapshot.data() ?? {};
        if (reel.createdBy !== uid) {
          throw new ReelApiError(403, 'FORBIDDEN_REEL', "Ce réel ne vous appartient pas.");
        }

        if (reel.processingStatus !== 'uploading') {
          throw new ReelApiError(409, 'REEL_STATUS_CHANGED', "Le statut du réel a déjà changé.");
        }

        transaction.update(reelRef, {
          processingStatus: 'failed',
          processingError,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      logger.info('Reel upload marked as failed', {
        uid,
        reelId,
      });

      return jsonResponse({
        success: true,
        reelId,
        message: 'Réel marqué en échec.',
      });
    }

    if (action === 'update-details') {
      await assertAnnouncer(db, uid);

      const contact = sanitizeEditableContact(body.contact);
      const description = sanitizeEditableDescription(body.description);

      await db.runTransaction(async (transaction) => {
        const reelSnapshot = await transaction.get(reelRef);
        if (!reelSnapshot.exists) {
          throw new ReelApiError(404, 'REEL_NOT_FOUND', 'Réel introuvable.');
        }

        const reel = reelSnapshot.data() ?? {};
        if (reel.createdBy !== uid) {
          throw new ReelApiError(403, 'FORBIDDEN_REEL', "Ce réel ne vous appartient pas.");
        }

        transaction.update(reelRef, {
          contact: contact ?? FieldValue.delete(),
          description: description ?? FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      logger.info('Reel details updated', {
        uid,
        reelId,
        hasContact: Boolean(contact),
        hasDescription: Boolean(description),
      });

      return jsonResponse({
        success: true,
        reelId,
        message: 'Réel modifié avec succès.',
      });
    }

    await assertAnnouncer(db, uid);

    const propertyId = sanitizeDocId(body.propertyId, 'Annonce');
    const propertyRef = db.collection(firebaseCollectionNames.properties).doc(propertyId);

    await db.runTransaction(async (transaction) => {
      const reelSnapshot = await transaction.get(reelRef);
      if (!reelSnapshot.exists) {
        throw new ReelApiError(404, 'REEL_NOT_FOUND', 'Réel introuvable.');
      }

      const reel = reelSnapshot.data() ?? {};
      if (reel.createdBy !== uid) {
        throw new ReelApiError(403, 'FORBIDDEN_REEL', "Ce réel ne vous appartient pas.");
      }

      if (reel.propertyId !== null && typeof reel.propertyId !== 'undefined') {
        throw new ReelApiError(409, 'REEL_ALREADY_ATTACHED', 'Ce réel est déjà rattaché à une annonce.');
      }

      await assertOwnedProperty(transaction, propertyRef, uid);

      transaction.update(reelRef, {
        propertyId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    logger.info('Reel attached to property', {
      uid,
      reelId,
      propertyId,
    });

    return jsonResponse({
      success: true,
      reelId,
      message: 'Réel rattaché avec succès.',
    });
  } catch (error) {
    if (error instanceof ReelApiError) {
      logger.warn('Reel attach rejected', {
        code: error.code,
        status: error.status,
        message: error.message,
      });
      return jsonError(error);
    }

    logger.error('Reel attach failed', { error });
    return jsonResponse(
      {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors du rattachement du réel.',
      },
      500
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<ReelApiResponse>> {
  try {
    const uid = await authenticateRequest(request);
    const body = await readJsonBody(request);
    const reelId = sanitizeDocId(body.reelId, 'Reel ID');

    const db = getAdminDb();
    await assertAnnouncer(db, uid);

    const reelRef = db.collection(firebaseCollectionNames.reels).doc(reelId);
    let storagePaths: string[] = [];
    let reelExisted = false;

    await db.runTransaction(async (transaction) => {
      const reelSnapshot = await transaction.get(reelRef);
      if (!reelSnapshot.exists) {
        return;
      }

      const reel = reelSnapshot.data() ?? {};
      if (reel.createdBy !== uid) {
        throw new ReelApiError(403, 'FORBIDDEN_REEL', "Ce réel ne vous appartient pas.");
      }

      reelExisted = true;
      storagePaths = getStoragePathsFromReel(reel);
      transaction.delete(reelRef);
    });

    if (reelExisted) {
      await deleteStorageObjects(storagePaths);
    }

    logger.info('Reel deleted', {
      uid,
      reelId,
      alreadyDeleted: !reelExisted,
      storagePathCount: storagePaths.length,
    });

    return jsonResponse({
      success: true,
      reelId,
      message: 'Réel supprimé avec succès.',
    });
  } catch (error) {
    if (error instanceof ReelApiError) {
      logger.warn('Reel deletion rejected', {
        code: error.code,
        status: error.status,
        message: error.message,
      });
      return jsonError(error);
    }

    logger.error('Reel deletion failed', { error });
    return jsonResponse(
      {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la suppression du réel.',
      },
      500
    );
  }
}
