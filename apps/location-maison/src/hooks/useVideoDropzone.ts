// useVideoDropzone.ts
import { useDropzone } from "react-dropzone";
import { useState } from "react";
import { MAX_REEL_DURATION_SECONDS, MAX_REEL_RAW_SIZE_BYTES } from "@/constantes";

export type VideoDropzoneRejectionReason =
  | 'invalid-type'
  | 'too-large'
  | 'too-long'
  | 'duration-read-error';

export interface VideoDropzoneFeedback {
  reason: VideoDropzoneRejectionReason;
}

/**
 * Lit la durée d'un fichier vidéo côté navigateur (metadata seule, pas de décodage complet)
 * en le montant temporairement dans un <video> hors DOM.
 */
function readVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      if (!Number.isFinite(duration)) {
        reject(new Error('Durée de la vidéo illisible.'));
        return;
      }
      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Impossible de lire les métadonnées de la vidéo.'));
    };

    video.src = objectUrl;
  });
}

export function useVideoDropzone({
  onFile,
  onRejected,
}: {
  onFile: (file: File, durationSeconds: number) => void;
  onRejected?: (feedback: VideoDropzoneFeedback) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    maxFiles: 1,
    multiple: false,
    accept: {
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
      "video/webm": [".webm"],
    },
    onDrop: async (acceptedFiles, fileRejections) => {
      if (fileRejections.length > 0) {
        onRejected?.({ reason: 'invalid-type' });
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > MAX_REEL_RAW_SIZE_BYTES) {
        onRejected?.({ reason: 'too-large' });
        return;
      }

      setIsProcessing(true);
      try {
        const durationSeconds = await readVideoDurationSeconds(file);
        if (durationSeconds > MAX_REEL_DURATION_SECONDS) {
          onRejected?.({ reason: 'too-long' });
          return;
        }
        onFile(file, durationSeconds);
      } catch {
        onRejected?.({ reason: 'duration-read-error' });
      } finally {
        setIsProcessing(false);
      }
    },
  });

  return { getInputProps, getRootProps, isDragActive, isProcessing };
}
