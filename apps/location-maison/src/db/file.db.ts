/**
 * @module db
 */

import { Image } from "@/models/annonce";
import { createLogger } from '@/lib/logger';

const logger = createLogger('db.file');

const getStorage = () => import("@/firebase/storage");

const THUMBNAIL_MAX_SIZE_MB = 0.08;
const THUMBNAIL_MAX_DIMENSION_PX = 640;

/**
 * Generates a unique file name by appending a timestamp to the original file name.
 * 
 * This function uses the current Unix timestamp (the number of milliseconds since January 1, 1970)
 * and concatenates it with the specified file name, ensuring that the file name is unique 
 * based on the time it was generated.
 * 
 * @param {string} fileName - The original file name to be modified.
 * @returns {string} - A new file name with the timestamp added as a prefix.
 */
export function timestampedFileName(fileName: string): string {
    return `${new Date().valueOf()}${fileName}`;
}

function extractStorageErrorMessage(error: unknown): string {
    if (!(error instanceof Error)) {
        return "Unknown storage error";
    }

    const maybeWithCode = error as Error & { code?: string; serverResponse?: string };

    if (maybeWithCode.code === 'storage/unauthorized') {
        return "Vous n'avez pas l'autorisation d'uploader des images.";
    }

    if (maybeWithCode.code === 'storage/canceled') {
        return "Upload annulé.";
    }

    if (maybeWithCode.code === 'storage/retry-limit-exceeded') {
        return "Upload trop long (délai dépassé). Vérifiez la connexion puis réessayez.";
    }

    if (typeof maybeWithCode.serverResponse === 'string' && maybeWithCode.serverResponse.includes('"code": 412')) {
        return "Le bucket Firebase Storage est mal configuré (erreur 412).";
    }

    return error.message || "Failed to upload file";
}

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

const DOWNLOAD_URL_TIMEOUT_MS = 30_000;
const DOWNLOAD_URL_RETRIES = 3;
const DOWNLOAD_URL_RETRY_BASE_DELAY_MS = 500;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Reconstruit l'URL de téléchargement à partir des métadonnées renvoyées par l'upload lui-même.
 *
 * `getDownloadURL` ne fait rien d'autre que ça : un GET sur les métadonnées de l'objet pour en
 * extraire `downloadTokens`, puis cette concaténation. Or `uploadBytes` renvoie déjà ces mêmes
 * métadonnées — le round-trip supplémentaire n'apporte aucune information et constitue un point
 * de panne réseau gratuit (constaté en prod le 2026-08-17 : image de 306 Ko uploadée avec succès,
 * puis `getDownloadURL` en timeout, annonce perdue et crédit IA facturé pour rien).
 *
 * Renvoie `null` si le token est absent — cas possible sur un bucket sans token de téléchargement
 * — auquel cas l'appelant retombe sur `getDownloadURL`.
 *
 * NB : l'app n'utilise pas l'émulateur Storage (`@/firebase/storage` appelle `getStorage(app)` sans
 * `connectStorageEmulator`), l'hôte est donc toujours celui de production. À revoir si ça change.
 */
function buildDownloadURLFromMetadata(metadata: {
    bucket?: string;
    fullPath?: string;
    downloadTokens?: string[] | undefined;
}): string | null {
    const token = metadata?.downloadTokens?.[0];

    if (!token || !metadata.bucket || !metadata.fullPath) {
        return null;
    }

    const encodedPath = encodeURIComponent(metadata.fullPath);
    return `https://firebasestorage.googleapis.com/v0/b/${metadata.bucket}/o/${encodedPath}?alt=media&token=${token}`;
}

/**
 * Chemin de repli lorsque l'upload n'a pas renvoyé de token : `getDownloadURL` avec retry en
 * backoff. Un simple hoquet réseau ne doit plus coûter toute l'annonce à l'annonceur.
 */
async function fetchDownloadURLWithRetry(
    fetchURL: () => Promise<string>,
    operation: string
): Promise<string> {
    let lastError: unknown;

    for (let attempt = 0; attempt < DOWNLOAD_URL_RETRIES; attempt += 1) {
        try {
            return await withTimeout(fetchURL(), DOWNLOAD_URL_TIMEOUT_MS, operation);
        } catch (error) {
            lastError = error;

            if (attempt < DOWNLOAD_URL_RETRIES - 1) {
                logger.warn('Download URL retrieval failed, retrying', { error, operation, attempt });
                await delay(DOWNLOAD_URL_RETRY_BASE_DELAY_MS * 2 ** attempt);
            }
        }
    }

    throw lastError;
}

/**
 * Génère et uploade une variante basse résolution du fichier déjà compressé, utilisée dans les
 * contextes "liste" (cartes de recherche, favoris, gestion des annonces) pour éviter de servir
 * la même image pleine résolution partout. Best-effort : une vignette manquante n'empêche jamais
 * la création de l'annonce, les appelants retombent sur `fileURL`.
 */
async function uploadThumbnail(
    file: File,
    location: string,
    uniqueFileName: string
): Promise<{ thumbURL: string; thumbPATH: string } | null> {
    try {
        const [{ storage, ref, uploadBytes, getDownloadURL }, { default: imageCompression }] = await Promise.all([
            getStorage(),
            import("browser-image-compression"),
        ]);

        const thumbnailFile = await imageCompression(file, {
            maxSizeMB: THUMBNAIL_MAX_SIZE_MB,
            maxWidthOrHeight: THUMBNAIL_MAX_DIMENSION_PX,
        });

        const thumbRef = ref(storage, `${location}/thumb_${uniqueFileName}`);
        const thumbPATH = thumbRef.fullPath;

        const uploadResult = await withTimeout(uploadBytes(thumbRef, thumbnailFile), 15_000, "Upload vignette");

        const thumbURL =
            buildDownloadURLFromMetadata(uploadResult.metadata) ??
            (await fetchDownloadURLWithRetry(() => getDownloadURL(thumbRef), "Récupération URL vignette"));

        return { thumbURL, thumbPATH };
    } catch (error) {
        logger.warn('Thumbnail generation failed, falling back to full-size image', {
            error,
            fileName: file?.name,
            location,
        });
        return null;
    }
}

/**
 * Uploads a file to a specified location in cloud storage and generates a download URL.
 *
 * This function uploads a file to the specified `location` in cloud storage, using the
 * `ownerId` for custom metadata to track ownership and status. A timestamp is appended
 * to the file name to ensure uniqueness.
 *
 * @param {File} file - The file to be uploaded.
 * @param {string} ownerId - The ID of the owner of the file, stored in the file metadata.
 * @param {string} location - The storage location where the file will be uploaded.
 * @returns {Promise<Image}>} - Returns an object containing the file URL and its storage path.
 * @throws {Error} - Throws an error if the file upload or URL generation fails.
 */
export async function createFile(file: File, ownerId: string | undefined, location: string): Promise<Image> {
    try {
        const { storage, ref, uploadBytes, getDownloadURL } = await getStorage();
        const uniqueFileName = timestampedFileName(file.name);
        // Create a storage reference with a unique name
        let fileRef = ref(
            storage,
            `${location}/${uniqueFileName}`
        );
        let filePATH = fileRef.fullPath;

        // File metadata including owner information
        const metadata = {
            customMetadata: {
                owner: ownerId || 'unknown',
                status: 'InProgress'
            },
        };
        // Upload the file with metadata
        const uploadResult = await withTimeout(uploadBytes(fileRef, file, metadata), 20_000, "Upload image");

        // L'URL est déduite des métadonnées de l'upload ; `getDownloadURL` n'est appelé qu'en repli.
        const fileURL =
            buildDownloadURLFromMetadata(uploadResult.metadata) ??
            (await fetchDownloadURLWithRetry(() => getDownloadURL(fileRef), "Récupération URL image"));

        const thumbnail = await uploadThumbnail(file, location, uniqueFileName);

        return { fileURL, filePATH, ...(thumbnail ?? {}) };
    } catch (error) {
        const message = extractStorageErrorMessage(error);
        logger.error('File upload failed', {
            error,
            message,
            fileName: file?.name,
            fileSize: file?.size,
            fileType: file?.type,
            ownerId: ownerId || 'unknown',
            location,
        });
        throw new Error(message);
    }
}

/**
 * Updates the status of a file to "Archived" in cloud storage metadata.
 * 
 * This function updates the custom metadata of a file in cloud storage to set its status 
 * to "Archived". It retrieves the existing file, updates its metadata, and re-applies 
 * the new metadata.
 * 
 * @param {string} filePath - The full path of the file in storage.
 * @returns {Promise<void>} - Resolves once the status has been updated.
 * @throws {Error} - Throws an error if the update fails.
 */
export async function updateFile(filePath: string): Promise<void> {
    try {
        const { storage, ref, updateMetadata } = await getStorage();

        // Reference to the file in storage
        const fileRef = ref(storage, filePath);

        // Update the custom metadata status to "Archived"
        const newMetadata = {
            customMetadata: {
                status: 'Archived',
            },
        };

        // Apply the updated metadata to the file
        await updateMetadata(fileRef, newMetadata);
    } catch (error) {
        logger.error('Failed to update file status', { error, filePath });
        throw new Error("Failed to update file metadata");
    }
}
