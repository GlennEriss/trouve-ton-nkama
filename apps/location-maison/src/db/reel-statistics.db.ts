/**
 * @module db
 *
 * Volontairement minimal comparé à property-statistics.db.ts : un réel n'a qu'un compteur de
 * vues simple (`reels/{id}.viewCount`), pas de document d'analytics séparé — pas de
 * ventilation par jour/heure/province, pas de suivi de durée de visionnage. À enrichir plus
 * tard si un vrai besoin apparaît, pas par anticipation.
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
