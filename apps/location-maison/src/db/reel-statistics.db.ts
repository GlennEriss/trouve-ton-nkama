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

const logger = createLogger('db.reel-statistics');

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
export async function trackReelView(reelId: string): Promise<boolean> {
    try {
        const db = getFirestoreAdmin();
        const reelRef = db.collection(firebaseCollectionNames.reels).doc(reelId);
        const snap = await reelRef.get();
        if (!snap.exists) {
            return false;
        }

        await reelRef.update({
            viewCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
        });
        return true;
    } catch (error) {
        logger.error('Error tracking reel view', { reelId, error });
        return false;
    }
}

export async function trackReelLike(reelId: string, liked: boolean): Promise<boolean> {
    try {
        const db = getFirestoreAdmin();
        const reelRef = db.collection(firebaseCollectionNames.reels).doc(reelId);

        await db.runTransaction(async (transaction) => {
            const snap = await transaction.get(reelRef);
            if (!snap.exists) {
                throw new Error('Reel not found');
            }

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
        });

        return true;
    } catch (error) {
        logger.error('Error tracking reel like', { reelId, liked, error });
        return false;
    }
}

export async function trackReelShare(reelId: string, target?: string): Promise<boolean> {
    try {
        const db = getFirestoreAdmin();
        const reelRef = db.collection(firebaseCollectionNames.reels).doc(reelId);
        const snap = await reelRef.get();
        if (!snap.exists) {
            return false;
        }

        const updates: Record<string, FirebaseFirestore.FieldValue> = {
            shareCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (target) {
            updates[`shareTargets.${target}`] = FieldValue.increment(1);
        }

        await reelRef.update(updates);
        return true;
    } catch (error) {
        logger.error('Error tracking reel share', { reelId, target, error });
        return false;
    }
}
