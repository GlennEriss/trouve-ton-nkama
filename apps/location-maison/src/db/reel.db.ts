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
    contact?: string,
    description?: string,
    trim?: { trimStartSeconds?: number; trimEndSeconds?: number; muted?: boolean },
    // Chip "Immobilier"/"Mode" choisi directement sur l'écran de création quand aucune annonce
    // n'est présélectionnée (CreateOrphanReelClient) — ignoré côté serveur si propertyId est
    // fourni (la catégorie de l'annonce prévaut alors, voir /api/reels/route.ts).
    categoryRoot?: 'Immobilier' | 'Mode'
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
                description,
                trimStartSeconds: trim?.trimStartSeconds,
                trimEndSeconds: trim?.trimEndSeconds,
                muted: trim?.muted,
                categoryRoot,
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

export async function updateReelDetails(
    reelId: string,
    contact: string,
    description: string
): Promise<boolean> {
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
                action: 'update-details',
                reelId,
                contact,
                description,
            }),
        });

        const result = await response.json().catch(() => null) as { success?: boolean; message?: string } | null;

        if (!response.ok || !result?.success) {
            throw new Error(result?.message || "La modification du réel a échoué.");
        }

        return true;
    } catch (error) {
        logger.error('Reel details update failed', {
            error,
            reelId,
        });
        throw error;
    }
}

/**
 * Renvoie la vidéo déjà publiée (déjà transcodée) comme nouveau brut pour que
 * transcodeReelVideo la recoupe à nouveau selon les nouvelles bornes — seule façon de "rogner"
 * un réel déjà "ready" (le brut d'origine, lui, est supprimé après le premier traitement, voir
 * EditReelClient.tsx). Écrit aussi contact/description en un seul aller-retour, mêmes
 * conventions que update-details (vide -> champ supprimé).
 */
export async function retrimReel(
    reelId: string,
    rawVideoPath: string,
    trimStartSeconds: number,
    trimEndSeconds: number,
    muted: boolean,
    contact: string,
    description: string
): Promise<boolean> {
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
                action: 'retrim',
                reelId,
                rawVideoPath,
                trimStartSeconds,
                trimEndSeconds,
                muted,
                contact,
                description,
            }),
        });

        const result = await response.json().catch(() => null) as { success?: boolean; message?: string } | null;

        if (!response.ok || !result?.success) {
            throw new Error(result?.message || "Le nouveau montage a échoué.");
        }

        return true;
    } catch (error) {
        logger.error('Reel retrim failed', {
            error,
            reelId,
        });
        throw error;
    }
}

export async function deleteReel(reelId: string): Promise<boolean> {
    try {
        const { auth } = await getAuth();
        const token = await auth.currentUser?.getIdToken();

        if (!token) {
            throw new Error("Session Firebase introuvable. Rechargez la page puis réessayez.");
        }

        const response = await fetch('/api/reels', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ reelId }),
        });

        const result = await response.json().catch(() => null) as { success?: boolean; message?: string } | null;

        if (!response.ok || !result?.success) {
            throw new Error(result?.message || "La suppression du réel a échoué.");
        }

        return true;
    } catch (error) {
        logger.error('Reel deletion failed', {
            error,
            reelId,
        });
        throw error;
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

/**
 * Réels d'un propriétaire, paginés par curseur (même pattern que getPublicReels) et
 * filtrables par plage de dates de création — le filtre s'appuie sur l'index composite
 * existant (createdBy ASC, createdAt DESC), aucune migration Firestore nécessaire.
 */
export async function getReelsByOwner(
    ownerId: string,
    options?: {
        limitPerPage?: number;
        cursor?: string | null;
        startDate?: Date | null;
        endDate?: Date | null;
    }
): Promise<{ reels: (Reel & { id: string })[]; nextCursor: string | null }> {
    const { collection, getDocs, doc, getDoc, db, where, query, orderBy, startAfter, limit, Timestamp } = await getFirestore();
    const reelsRef = collection(db, firebaseCollectionNames.reels);

    const constraints = [where('createdBy', '==', ownerId)];
    if (options?.startDate) {
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(options.startDate)));
    }
    if (options?.endDate) {
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(options.endDate)));
    }

    const requestedLimit = options?.limitPerPage ?? 20;
    const limitPerPage = Number.isInteger(requestedLimit)
        ? Math.min(50, Math.max(1, requestedLimit))
        : 20;
    let q = query(reelsRef, ...constraints, orderBy('createdAt', 'desc'), limit(limitPerPage + 1));

    if (options?.cursor) {
        const cursorSnap = await getDoc(doc(db, firebaseCollectionNames.reels, options.cursor));
        if (cursorSnap.exists()) {
            q = query(q, startAfter(cursorSnap));
        }
    }

    const snapshot = await getDocs(q);
    const pageDocs = snapshot.docs.slice(0, limitPerPage);
    const reels = pageDocs.map((d) => ({ ...(d.data() as Reel), id: d.id }));
    const nextCursor = snapshot.docs.length > limitPerPage && pageDocs.length > 0
        ? pageDocs[pageDocs.length - 1].id
        : null;

    return { reels, nextCursor };
}

export async function getReelById(reelId: string): Promise<(Reel & { id: string }) | null> {
    const { doc, getDoc, db } = await getFirestore();
    const snapshot = await getDoc(doc(db, firebaseCollectionNames.reels, reelId));
    if (!snapshot.exists()) return null;
    return { ...(snapshot.data() as Reel), id: snapshot.id };
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
    categoryRootName,
}: {
    limitPerPage: number;
    cursor: string | null;
    // Nom exact de la racine (ex. "Immobilier", "Mode"), même convention que le paramètre
    // `category` de /search (Lot 4) — jamais saisi librement, toujours issu de
    // GET /api/categories/active. Absent => comportement historique inchangé (onglet
    // "Tout"). ⚠️ Nécessite un index composite Firestore (categoryPath.lvl0 Asc,
    // processingStatus Asc, moderationStatus Asc, createdAt Desc) sur `reels`, à créer
    // avant que le filtre par catégorie fonctionne — voir home-sections/route.ts pour la
    // même précaution côté annonces. Sans lui, la requête échoue proprement et le feed
    // retombe sur "Tout" côté client (ReelsFeedClient), pas de crash public.
    categoryRootName?: string;
}): Promise<{ reels: (Reel & { id: string })[]; nextCursor: string | null }> {
    const { collection, getDocs, doc, getDoc, db, where, query, orderBy, startAfter, limit } = await getFirestore();
    const pageSize = Number.isInteger(limitPerPage)
        ? Math.min(50, Math.max(1, limitPerPage))
        : 10;
    const reelsRef = collection(db, firebaseCollectionNames.reels);
    let q = query(
        reelsRef,
        where('processingStatus', '==', 'ready'),
        where('moderationStatus', '==', 'APPROVED'),
        ...(categoryRootName ? [where('categoryPath.lvl0', '==', categoryRootName)] : []),
        orderBy('createdAt', 'desc'),
        limit(pageSize + 1)
    );

    if (cursor) {
        const cursorSnap = await getDoc(doc(db, firebaseCollectionNames.reels, cursor));
        if (cursorSnap.exists()) {
            q = query(q, startAfter(cursorSnap));
        }
    }

    const querySnapshot = await getDocs(q);
    const pageDocs = querySnapshot.docs.slice(0, pageSize);
    const reels = pageDocs.map((d) => ({ ...(d.data() as Reel), id: d.id }));

    const nextCursor = querySnapshot.docs.length > pageSize && pageDocs.length > 0
        ? pageDocs[pageDocs.length - 1].id
        : null;

    return { reels, nextCursor };
}

export type UploadRawReelVideoProgress = {
    bytesTransferred: number;
    totalBytes: number;
    /** Borné à [0, 100] — voir docs/performance-creation-modification-annonces-reels.md, point 6. */
    percent: number;
};

export type UploadRawReelVideoOptions = {
    onProgress?: (progress: UploadRawReelVideoProgress) => void;
    /** Annule l'upload en cours (ex. l'utilisateur quitte l'écran) — voir "Annulation" du point 6. */
    signal?: AbortSignal;
};

const RAW_VIDEO_UPLOAD_TIMEOUT_MS = 600_000;

/**
 * Upload le fichier vidéo brut — la Cloud Function de transcodage se déclenche sur cet upload
 * et prend le relais (durée réelle, conversion, miniature), ce module ne fait que déposer le
 * fichier au bon endroit.
 *
 * `uploadBytesResumable` (pas `uploadBytes`) : expose une progression réelle
 * (`state_changed`) et une tâche annulable, sans changer le chemin Storage ni les métadonnées
 * — voir docs/performance-creation-modification-annonces-reels.md, point 6. Le contrat
 * (chemin retourné, erreurs traduites, timeout) reste identique pour les appelants existants.
 */
export async function uploadRawReelVideo(
    file: File,
    ownerId: string,
    reelId: string,
    options: UploadRawReelVideoOptions = {},
): Promise<string> {
    try {
        const { storage, ref, uploadBytesResumable } = await getStorage();
        const rawVideoPath = buildRawReelVideoPath(file, ownerId, reelId);
        const fileRef = ref(storage, rawVideoPath);

        const metadata = {
            customMetadata: {
                owner: ownerId,
                reelId,
            },
        };

        const task = uploadBytesResumable(fileRef, file, metadata);

        if (options.signal) {
            if (options.signal.aborted) {
                task.cancel();
            } else {
                options.signal.addEventListener('abort', () => task.cancel(), { once: true });
            }
        }

        const uploadCompleted = new Promise<void>((resolve, reject) => {
            task.on(
                'state_changed',
                (snapshot) => {
                    if (!options.onProgress) return;
                    // totalBytes est normalement > 0 (fichier déjà sélectionné) ; repli à 1
                    // uniquement pour éviter une division par zéro dans un cas limite.
                    const totalBytes = snapshot.totalBytes || 1;
                    const percent = Math.min(
                        100,
                        Math.max(0, Math.round((snapshot.bytesTransferred / totalBytes) * 100)),
                    );
                    options.onProgress({
                        bytesTransferred: snapshot.bytesTransferred,
                        totalBytes: snapshot.totalBytes,
                        percent,
                    });
                },
                (error) => reject(error),
                () => resolve(),
            );
        });

        try {
            // 10 min (pas 2, l'ancienne valeur) : à l'ancien plafond de 500 Mo, 2 min exigeait
            // déjà un débit montant soutenu d'environ 33 Mbps pour ne pas expirer avant la fin
            // de l'envoi — hors de portée d'une connexion mobile moyenne. Avec le nouveau
            // plafond (1 Go), une marge courte aurait fait systématiquement échouer les gros
            // fichiers sur une connexion lente au lieu de simplement prendre plus longtemps.
            await withTimeout(uploadCompleted, RAW_VIDEO_UPLOAD_TIMEOUT_MS, "Upload vidéo");
        } catch (timeoutOrUploadError) {
            // Le timeout ci-dessus ne coupe pas la tâche Storage sous-jacente : l'annuler
            // explicitement plutôt que la laisser tourner en arrière-plan indéfiniment.
            task.cancel();
            throw timeoutOrUploadError;
        }

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
            cancelled: (error as { code?: string } | null)?.code === 'storage/canceled',
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
