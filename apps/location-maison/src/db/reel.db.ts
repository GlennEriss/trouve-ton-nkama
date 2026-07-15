/**
 * @module db
 */
import firebaseCollectionNames from "@/constantes/firebase-collection-name";
import { Reel } from "@/models/reel";
import { createLogger } from '@/lib/logger';

const logger = createLogger('db.reel');

const getStorage = () => import("@/firebase/storage");
const getFirestore = () => import("@/firebase/firestore");
const getAuth = () => import("@/firebase/auth");

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`${operation} a pris trop de temps.`));
        }, timeoutMs);

        promise
            .then((value) => {
                clearTimeout(timeoutId);
                resolve(value);
            })
            .catch((error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
    });
}

function extractStorageErrorMessage(error: unknown): string {
    if (!(error instanceof Error)) {
        return "Erreur inconnue lors de l'envoi de la vidéo.";
    }

    const maybeWithCode = error as Error & { code?: string };

    if (maybeWithCode.code === 'storage/unauthorized') {
        return "Vous n'avez pas l'autorisation d'uploader cette vidéo.";
    }

    if (maybeWithCode.code === 'storage/canceled') {
        return "Envoi annulé.";
    }

    if (maybeWithCode.code === 'storage/retry-limit-exceeded') {
        return "Envoi trop long (délai dépassé). Vérifiez la connexion puis réessayez.";
    }

    return error.message || "Échec de l'envoi de la vidéo.";
}

export function buildRawReelVideoPath(file: File, ownerId: string, reelId: string): string {
    const extension = file.name.includes('.') ? file.name.split('.').pop() : 'mp4';
    return `reels-raw/${ownerId}/${reelId}.${extension}`;
}

/**
 * Crée le document Firestore du réel via l'API serveur. Les anciens comptes prod peuvent avoir
 * un document users/{id} différent de leur UID Firebase : l'API retrouve donc le profil par uid
 * et écrit avec l'Admin SDK, tout en gardant les mêmes contrôles de rôle/propriété.
 */
export async function createReel(
    reelId: string,
    propertyId: string | null,
    ownerId: string,
    rawVideoPath: string,
    contact?: string
): Promise<string | null> {
    try {
        const { auth } = await getAuth();
        const token = await auth.currentUser?.getIdToken();

        if (!token || auth.currentUser?.uid !== ownerId) {
            throw new Error("Session Firebase introuvable. Rechargez la page puis réessayez.");
        }

        const response = await fetch('/api/reels', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                reelId,
                propertyId,
                rawVideoPath,
                contact,
            }),
        });

        const result = await response.json().catch(() => null) as { success?: boolean; reelId?: string; message?: string } | null;

        if (!response.ok || !result?.success || !result.reelId) {
            throw new Error(result?.message || "La création du réel a échoué.");
        }

        return result.reelId;
    } catch (error) {
        logger.error('Reel creation API failed', {
            error,
            reelId,
            propertyId,
            ownerId,
            rawVideoPath,
        });
        throw error;
    }
}

/**
 * Rattache a posteriori un réel orphelin (créé sans annonce, voir CreateOrphanReelClient) à une
 * annonce existante. L'API serveur applique le même passage null -> valeur unique, uniquement
 * vers une annonce possédée par l'appelant.
 */
export async function attachReelToProperty(reelId: string, propertyId: string): Promise<boolean> {
    try {
        const { auth } = await getAuth();
        const token = await auth.currentUser?.getIdToken();

        if (!token) {
            throw new Error("Session Firebase introuvable. Rechargez la page puis réessayez.");
        }

        const response = await fetch('/api/reels', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                action: 'attach-property',
                reelId,
                propertyId,
            }),
        });

        const result = await response.json().catch(() => null) as { success?: boolean; message?: string } | null;

        if (!response.ok || !result?.success) {
            throw new Error(result?.message || "Le rattachement du réel a échoué.");
        }

        return true;
    } catch (error) {
        logger.error('Reel attach API failed', {
            error,
            reelId,
            propertyId,
        });
        return false;
    }
}

export async function markReelUploadFailed(reelId: string, processingError: string): Promise<boolean> {
    try {
        const { auth } = await getAuth();
        const token = await auth.currentUser?.getIdToken();

        if (!token) {
            throw new Error("Session Firebase introuvable. Rechargez la page puis réessayez.");
        }

        const response = await fetch('/api/reels', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                action: 'mark-upload-failed',
                reelId,
                processingError,
            }),
        });

        const result = await response.json().catch(() => null) as { success?: boolean; message?: string } | null;

        if (!response.ok || !result?.success) {
            throw new Error(result?.message || "Le réel n'a pas pu être marqué en échec.");
        }

        return true;
    } catch (error) {
        logger.error('Reel upload failure mark failed', {
            error,
            reelId,
        });
        return false;
    }
}

export async function getReelsByOwner(ownerId: string): Promise<(Reel & { id: string })[]> {
    const { collection, getDocs, db, where, query, orderBy } = await getFirestore();
    const reelsRef = collection(db, firebaseCollectionNames.reels);
    const q = query(reelsRef, where('createdBy', '==', ownerId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ ...(doc.data() as Reel), id: doc.id }));
}

/**
 * Réels publics (flux) — SDK client utilisé côté serveur (API route), autorisé par
 * firestore.rules (`moderationStatus == 'APPROVED'` lisible par tous), pas besoin d'Admin SDK
 * pour une simple lecture publique (même principe que getProperties()).
 *
 * Curseur en id de document (string), pas en DocumentSnapshot brut — un DocumentSnapshot ne
 * survit pas à un aller-retour JSON via l'API HTTP (contrairement à getProperties(), qui renvoie
 * son lastDoc tel quel et n'est en pratique jamais rappelée avec un curseur, seulement en
 * première page). Mirror du pattern robuste déjà utilisé par useAdManagement.ts/`/api/announcer/ads`.
 */
export async function getPublicReels({
    limitPerPage,
    cursor,
}: {
    limitPerPage: number;
    cursor: string | null;
}): Promise<{ reels: (Reel & { id: string })[]; nextCursor: string | null }> {
    const { collection, getDocs, doc, getDoc, db, where, query, orderBy, startAfter, limit } = await getFirestore();
    const reelsRef = collection(db, firebaseCollectionNames.reels);
    let q = query(
        reelsRef,
        where('processingStatus', '==', 'ready'),
        where('moderationStatus', '==', 'APPROVED'),
        orderBy('createdAt', 'desc'),
        limit(limitPerPage)
    );

    if (cursor) {
        const cursorSnap = await getDoc(doc(db, firebaseCollectionNames.reels, cursor));
        if (cursorSnap.exists()) {
            q = query(q, startAfter(cursorSnap));
        }
    }

    const querySnapshot = await getDocs(q);
    const reels = querySnapshot.docs.map((d) => ({ ...(d.data() as Reel), id: d.id }));

    const nextCursor = querySnapshot.docs.length === limitPerPage
        ? querySnapshot.docs[querySnapshot.docs.length - 1].id
        : null;

    return { reels, nextCursor };
}

/**
 * Upload le fichier vidéo brut — la Cloud Function de transcodage se déclenche sur cet upload
 * et prend le relais (durée réelle, conversion, miniature), ce module ne fait que déposer le
 * fichier au bon endroit.
 */
export async function uploadRawReelVideo(file: File, ownerId: string, reelId: string): Promise<string> {
    try {
        const { storage, ref, uploadBytes } = await getStorage();
        const rawVideoPath = buildRawReelVideoPath(file, ownerId, reelId);
        const fileRef = ref(storage, rawVideoPath);

        const metadata = {
            customMetadata: {
                owner: ownerId,
                reelId,
            },
        };

        await withTimeout(uploadBytes(fileRef, file, metadata), 120_000, "Upload vidéo");

        return rawVideoPath;
    } catch (error) {
        const message = extractStorageErrorMessage(error);
        logger.error('Reel video upload failed', {
            error,
            message,
            fileName: file?.name,
            fileSize: file?.size,
            ownerId,
            reelId,
        });
        throw new Error(message);
    }
}

export function subscribeToReel(reelId: string, onChange: (reel: (Reel & { id: string }) | null) => void): () => void {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    getFirestore().then(({ doc, onSnapshot, db }) => {
        if (cancelled) return;
        const reelRef = doc(db, firebaseCollectionNames.reels, reelId);
        unsubscribe = onSnapshot(reelRef, (snapshot) => {
            if (!snapshot.exists()) {
                onChange(null);
                return;
            }
            onChange({ ...(snapshot.data() as Reel), id: snapshot.id });
        }, (error) => {
            logger.error('Reel subscription failed', { error, reelId });
        });
    });

    return () => {
        cancelled = true;
        unsubscribe?.();
    };
}
