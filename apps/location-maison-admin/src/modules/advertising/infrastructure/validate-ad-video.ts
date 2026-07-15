/**
 * Validation client (durée + taille) d'une vidéo de créa publicitaire, avant
 * upload. Mirroir exact de apps/location-maison/src/lib/ads/validate-ad-video.ts
 * (dupliqué volontairement, pas d'import cross-app).
 */
import { AD_VIDEO_MAX_DURATION_SECONDS, AD_VIDEO_MAX_SIZE_BYTES } from "@/modules/advertising/domain/types";

export type AdVideoRejectionReason = "too-large" | "too-long" | "duration-read-error";

export interface AdVideoValidationResult {
  ok: boolean;
  reason?: AdVideoRejectionReason;
  durationSeconds?: number;
}

function readVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      if (!Number.isFinite(duration)) {
        reject(new Error("Durée de la vidéo illisible."));
        return;
      }
      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Impossible de lire les métadonnées de la vidéo."));
    };

    video.src = objectUrl;
  });
}

export async function validateAdVideoFile(file: File): Promise<AdVideoValidationResult> {
  if (file.size > AD_VIDEO_MAX_SIZE_BYTES) {
    return { ok: false, reason: "too-large" };
  }

  try {
    const durationSeconds = await readVideoDurationSeconds(file);
    if (durationSeconds > AD_VIDEO_MAX_DURATION_SECONDS) {
      return { ok: false, reason: "too-long" };
    }
    return { ok: true, durationSeconds };
  } catch {
    return { ok: false, reason: "duration-read-error" };
  }
}

export const AD_VIDEO_REJECTION_MESSAGES: Record<AdVideoRejectionReason, string> = {
  "too-large": "Vidéo trop lourde (max 500 Mo).",
  "too-long": "Vidéo trop longue (max 5 min).",
  "duration-read-error": "Impossible de lire cette vidéo — essaie un autre fichier.",
};
