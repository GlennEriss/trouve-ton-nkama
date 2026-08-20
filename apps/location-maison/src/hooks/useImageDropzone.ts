// useImageDropzone.ts
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { useState } from "react";
import { MAX_IMAGES_UPLOAD } from "@/constantes";

export interface ImageDropzoneFeedback {
  invalidTypeCount: number;
  tooManyFilesCount: number;
  compressionErrorCount: number;
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
        const compressed: File[] = [];
        let compressionErrorCount = 0;

        const invalidTypeCount = fileRejections.reduce((count, rejection) => {
          const hasInvalidType = rejection.errors.some((error) => error.code === "file-invalid-type");
          return count + (hasInvalidType ? 1 : 0);
        }, 0);

        const tooManyFilesCount = fileRejections.reduce((count, rejection) => {
          const hasTooManyFiles = rejection.errors.some((error) => error.code === "too-many-files");
          return count + (hasTooManyFiles ? 1 : 0);
        }, 0);

        for (const file of acceptedFiles) {
          try {
            // Cible de compression indicative pour la librairie, pas un plafond qui exclut
            // le fichier : toute photo est acceptée quelle que soit sa taille d'origine ou
            // le résultat de la compression — seul un échec de compression (fichier corrompu,
            // format non géré par le navigateur) écarte une photo.
            const compressedFile = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1920 });
            compressed.push(compressedFile);
          } catch {
            compressionErrorCount += 1;
          }
        }

        onFiles(compressed.slice(0, MAX_IMAGES_UPLOAD));
        onFeedback?.({
          invalidTypeCount,
          tooManyFilesCount,
          compressionErrorCount,
        });
      } finally {
        setIsProcessing(false);
      }
    },
  });

  return { getInputProps, getRootProps, isDragActive, isProcessing };
}
