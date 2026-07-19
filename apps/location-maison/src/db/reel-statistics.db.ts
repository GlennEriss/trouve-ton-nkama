/**
 * @module db
 *
 * Volontairement minimal comparé à property-statistics.db.ts : les compteurs principaux des
 * réels vivent directement sur `reels/{id}`. Pas de ventilation par jour/heure/province pour
 * l'instant, seulement les métriques visibles par l'annonceur.
 */
import firebaseCollectionNames from "@/constantes/firebase-collection-name";
import { adminApp } from "@/firebase/admin";
import { getFirestore as getAdminFirestore, FieldValue } from "firebase-admin/firestore";
import { createLogger } from '@/lib/logger';
import { getCacheStore } from '@/lib/cache';

const logger = createLogger('db.reel-statistics');
const REEL_VIEW_TTL_SECONDS = 6 * 60 * 60;
const REEL_SHARE_TTL_SECONDS = 10;
const REEL_LIKE_STATE_TTL_SECONDS = 365 * 24 * 60 * 60;
const REEL_LIKE_LOCK_TTL_SECONDS = 5;

export type ReelStatisticResult = 'tracked' | 'duplicate' | 'not-found' | 'failed';

const getFirestoreAdmin = () => {
    if (!adminApp) {
        throw new Error('Firebase Admin not initialized');
    }
    return getAdminFirestore(adminApp as any);
};

/**
 * Incrémente le compteur de vues d'un réel. Utilise Admin SDK pour contourner firestore.rules
 * (un visiteur anonyme ne peut pas écrire sur reels/{id} directement — voir la règle `allow
 * update` qui ne couvre que le rattachement propertyId par le créateur).
 */
export async function trackReelView(
    reelId: string,
    actorId: string,
): Promise<ReelStatisticResult> {
    const cache = getCacheStore();
    const claimKey = `reel-stat:view:${reelId}:${actorId}`;
    const claimed = await cache.setIfAbsent(claimKey, true, REEL_VIEW_TTL_SECONDS);
    if (!claimed) return 'duplicate';

    try {
        const db = getFirestoreAdmin();
        const reelRef = db.collection(firebaseCollectionNames.reels).doc(reelId);
        await reelRef.update({
            viewCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
        });
        return 'tracked';
    } catch (error) {
        await cache.del(claimKey);
        const errorCode = typeof error === 'object' && error !== null && 'code' in error
            ? (error as { code?: unknown }).code
            : null;
        if (errorCode === 5 || errorCode === 'not-found') return 'not-found';

        logger.error('Error tracking reel view', { reelId, error });
        return 'failed';
    }
}

export async function trackReelLike(
    reelId: string,
    liked: boolean,
    actorId: string,
): Promise<ReelStatisticResult> {
    const cache = getCacheStore();
    const stateKey = `reel-stat:like-state:${reelId}:${actorId}`;
    const lockKey = `reel-stat:like-lock:${reelId}:${actorId}`;
    const lockAcquired = await cache.setIfAbsent(lockKey, true, REEL_LIKE_LOCK_TTL_SECONDS);
    if (!lockAcquired) return 'duplicate';

    try {
        const currentState = await cache.get<boolean>(stateKey);
        if (currentState === liked) return 'duplicate';

        const db = getFirestoreAdmin();
        const reelRef = db.collection(firebaseCollectionNames.reels).doc(reelId);

        const reelExists = await db.runTransaction(async (transaction) => {
            const snap = await transaction.get(reelRef);
            if (!snap.exists) return false;

            const currentLikeCount = typeof snap.data()?.likeCount === 'number'
                ? snap.data()?.likeCount as number
                : 0;
            const nextLikeCount = liked
                ? currentLikeCount + 1
                : Math.max(0, currentLikeCount - 1);

            transaction.update(reelRef, {
                likeCount: nextLikeCount,
                updatedAt: FieldValue.serverTimestamp(),
            });
            return true;
        });

        if (!reelExists) return 'not-found';
        await cache.set(stateKey, liked, REEL_LIKE_STATE_TTL_SECONDS);
        return 'tracked';
    } catch (error) {
        logger.error('Error tracking reel like', { reelId, liked, error });
        return 'failed';
    } finally {
        await cache.del(lockKey);
    }
}

export async function trackReelShare(
    reelId: string,
    target: string | undefined,
    actorId: string,
): Promise<ReelStatisticResult> {
    const cache = getCacheStore();
    const normalizedTarget = target || 'other';
    const claimKey = `reel-stat:share:${reelId}:${actorId}:${normalizedTarget}`;
    const claimed = await cache.setIfAbsent(claimKey, true, REEL_SHARE_TTL_SECONDS);
    if (!claimed) return 'duplicate';

    try {
        const db = getFirestoreAdmin();
        const reelRef = db.collection(firebaseCollectionNames.reels).doc(reelId);

        const updates: Record<string, FirebaseFirestore.FieldValue> = {
            shareCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (target) {
            updates[`shareTargets.${target}`] = FieldValue.increment(1);
        }

        await reelRef.update(updates);
        return 'tracked';
    } catch (error) {
        await cache.del(claimKey);
        const errorCode = typeof error === 'object' && error !== null && 'code' in error
            ? (error as { code?: unknown }).code
            : null;
        if (errorCode === 5 || errorCode === 'not-found') return 'not-found';

        logger.error('Error tracking reel share', { reelId, target, error });
        return 'failed';
    }
}
