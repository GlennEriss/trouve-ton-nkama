import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/firebase/admin';
import { auth } from '@/next-auth/auth';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';

const logger = createLogger('api.reels.byId');

/**
 * Un réel par id — deux usages avec des règles de visibilité différentes :
 *  - lien profond public (ex. partagé via WhatsApp) : le réel doit être approuvé ET traité
 *    (processingStatus 'ready' + moderationStatus 'APPROVED'), comme avant.
 *  - le propriétaire du réel, depuis "Mes réels" (clic sur une miniature, MyReelsClient.tsx) :
 *    doit pouvoir le visionner qu'il soit approuvé ou non — l'approbation ne conditionne que sa
 *    visibilité PUBLIQUE, pas le droit du créateur de relire sa propre vidéo. Le SDK client
 *    (ancien getPublicReelById(), voir reel.db.ts) ne pouvait de toute façon jamais satisfaire
 *    cette règle "créateur" de firestore.rules : cette route serveur n'a pas de session Firebase
 *    Auth réelle (même famille de bug que /api/property/[id] déjà corrigée cette session), donc
 *    la lecture était TOUJOURS anonyme aux yeux des règles, jamais reconnue comme le créateur —
 *    d'où "Ce réel n'est plus disponible" pour l'annonceur sur son propre réel non approuvé.
 *    Admin SDK ici, avec l'identité vérifiée côté serveur (session NextAuth), résout ça
 *    correctement plutôt que de contourner les règles sans vérifier qui demande.
 *
 * Pas de cache : trafic faible, fraîcheur préférable à la performance ici (contrairement à
 * /api/reels/feed).
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

    const db = getFirestore(adminApp);
    const snapshot = await db.collection(firebaseCollectionNames.reels).doc(reelId).get();
    if (!snapshot.exists) {
      return jsonApiError(404, 'NOT_FOUND', 'Réel introuvable');
    }

    const data = snapshot.data() ?? {};
    const isOwner = Boolean(viewerUid) && data.createdBy === viewerUid;
    const isPubliclyVisible = data.processingStatus === 'ready' && data.moderationStatus === 'APPROVED';

    if (!isOwner && !isPubliclyVisible) {
      return jsonApiError(404, 'NOT_FOUND', 'Réel introuvable');
    }

    return NextResponse.json({ reel: { ...data, id: snapshot.id } });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/reels/[reelId]',
      fallbackMessage: 'Failed to fetch reel',
    });
  }
}
