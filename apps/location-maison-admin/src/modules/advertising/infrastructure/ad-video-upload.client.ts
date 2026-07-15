"use client";

/**
 * Upload direct client → Storage pour les créas vidéo publicitaires
 * (emplacement reels_infeed uniquement), côté admin. Contourne volontairement
 * `/api/admin/v1/advertising/upload` (bufferise tout le fichier en mémoire
 * Node, plafonné à 3 Mo — inadapté à une vidéo jusqu'à 500 Mo) : upload
 * direct au SDK client (mirroir de `uploadAdCreativeVideo` côté app publique,
 * apps/location-maison/src/db/ad-video.db.ts).
 */

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getClientAuth, getClientStorage } from "@/lib/firebase/firebase-client";

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
  if (maybeWithCode.code === "storage/unauthorized") {
    return "Session Firebase expirée, reconnecte-toi puis réessaie.";
  }
  if (maybeWithCode.code === "storage/canceled") {
    return "Envoi annulé.";
  }
  if (maybeWithCode.code === "storage/retry-limit-exceeded") {
    return "Envoi trop long (délai dépassé). Vérifie la connexion puis réessaie.";
  }
  return error.message || "Échec de l'envoi de la vidéo.";
}

export async function uploadAdCreativeVideo(file: File): Promise<{ videoURL: string; videoPATH: string }> {
  const ownerUid = getClientAuth().currentUser?.uid;
  if (!ownerUid) {
    throw new Error("Session Firebase expirée, reconnecte-toi puis réessaie.");
  }

  try {
    const storage = getClientStorage();
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "mp4";
    const videoPATH = `ad-campaigns-video/${ownerUid}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const fileRef = ref(storage, videoPATH);

    // Timeout généreux (5 min) : fichiers jusqu'à 500 Mo.
    await withTimeout(uploadBytes(fileRef, file), 300_000, "Upload vidéo pub");
    const videoURL = await withTimeout(getDownloadURL(fileRef), 15_000, "Récupération URL vidéo pub");

    return { videoURL, videoPATH };
  } catch (error) {
    throw new Error(extractStorageErrorMessage(error));
  }
}
