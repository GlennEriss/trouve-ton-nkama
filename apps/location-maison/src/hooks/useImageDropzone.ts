// useImageDropzone.ts
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { useState } from "react";
import { MAX_IMAGES_UPLOAD } from "@/constantes";

export interface ImageDropzoneFeedback {
  invalidTypeCount: number;
  tooManyFilesCount: number;
}

export function useImageDropzone({
  onFiles,
  onFeedback,
}: {
  onFiles: (files: File[]) => void;
  onFeedback?: (feedback: ImageDropzoneFeedback) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    maxFiles: MAX_IMAGES_UPLOAD,
    multiple: true,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    onDrop: async (acceptedFiles, fileRejections) => {
      if (acceptedFiles.length === 0 && fileRejections.length === 0) return;

      setIsProcessing(true);
      try {
        const invalidTypeCount = fileRejections.reduce((count, rejection) => {
          const hasInvalidType = rejection.errors.some((error) => error.code === "file-invalid-type");
          return count + (hasInvalidType ? 1 : 0);
        }, 0);

        const tooManyFilesCount = fileRejections.reduce((count, rejection) => {
          const hasTooManyFiles = rejection.errors.some((error) => error.code === "too-many-files");
          return count + (hasTooManyFiles ? 1 : 0);
        }, 0);

        const processed: File[] = [];
        for (const file of acceptedFiles) {
          try {
            // Ré-encodage unique, sans aucune contrainte : ni cible de poids (`maxSizeMB`),
            // ni limite de dimensions (`maxWidthOrHeight`). On garde le résultat tel quel
            // quelle que soit sa taille — l'objectif est juste de re-passer la photo par
            // l'encodeur, pas de la faire tenir sous un seuil. Si le navigateur ne sait pas
            // décoder l'image (HEIC des iPhone, canvas saturé), on conserve l'original au
            // lieu de l'écarter : sinon un vendeur dont toutes les photos échouent se
            // retrouve incapable d'ajouter la moindre image, donc de publier son annonce.
            const compressedFile = await imageCompression(file, { initialQuality: 0.7 });
            processed.push(compressedFile);
          } catch {
            processed.push(file);
          }
        }

        onFiles(processed.slice(0, MAX_IMAGES_UPLOAD));
        onFeedback?.({
          invalidTypeCount,
          tooManyFilesCount,
        });
      } finally {
        setIsProcessing(false);
      }
    },
  });

  return { getInputProps, getRootProps, isDragActive, isProcessing };
}
