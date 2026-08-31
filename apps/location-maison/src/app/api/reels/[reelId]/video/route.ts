import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { adminApp } from '@/firebase/admin';
import { auth } from '@/next-auth/auth';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';

export const runtime = 'nodejs';

const logger = createLogger('api.reels.video');

/**
 * Sert les octets vidéo d'un réel déjà publié, pour son propriétaire uniquement — utilisé par
 * EditReelClient.tsx pour charger la vidéo dans la barre de montage avant un nouveau découpage.
 *
 * Nécessaire car un fetch() direct depuis le navigateur vers l'URL Firebase Storage
 * (firebasestorage.googleapis.com) échoue en CORS : le bucket n'a aucune configuration CORS
 * (constaté en reproduisant l'échec réel signalé par l'utilisateur — "Failed to fetch" en
 * console). `<video src=...>` fonctionnait déjà sans souci puisque la lecture ne passe jamais
 * par fetch/XHR, seulement par le chargement natif du navigateur, qui n'est pas soumis à CORS.
 * Cette route contourne ça en récupérant les octets côté serveur (Admin SDK, jamais soumis aux
 * règles CORS navigateur) et en les renvoyant same-origin.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reelId: string }> },
) {
  try {
    const { reelId } = await params;
    if (!reelId) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Reel ID is required');
    }

    if (!adminApp) {
      return jsonApiError(500, 'FIREBASE_ADMIN_UNAVAILABLE', 'Firebase admin non initialisé.');
    }

    const session = await auth().catch(() => null);
    const viewerUid = session?.user?.uid;
    if (!viewerUid) {
      return jsonApiError(401, 'UNAUTHENTICATED', 'Connexion requise.');
    }

    const db = getFirestore(adminApp);
    const snapshot = await db.collection(firebaseCollectionNames.reels).doc(reelId).get();
    if (!snapshot.exists) {
      return jsonApiError(404, 'NOT_FOUND', 'Réel introuvable');
    }

    const data = snapshot.data() ?? {};
    // Réservé au propriétaire : un visiteur n'a jamais besoin de recharger les octets pour
    // monter le réel de quelqu'un d'autre.
    if (data.createdBy !== viewerUid) {
      return jsonApiError(404, 'NOT_FOUND', 'Réel introuvable');
    }

    const videoPath = typeof data.videoPath === 'string' ? data.videoPath : '';
    if (!videoPath) {
      return jsonApiError(404, 'NOT_FOUND', 'Vidéo introuvable.');
    }

    const storage = getStorage(adminApp);
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
    const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
    const [buffer] = await bucket.file(videoPath).download();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/reels/[reelId]/video',
      fallbackMessage: 'Failed to fetch reel video',
    });
  }
}
