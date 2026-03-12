// useImageDropzone.ts
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { useState } from "react";
import { MAX_IMAGES_UPLOAD } from "@/constantes";

export interface ImageDropzoneFeedback {
  invalidTypeCount: number;
  tooManyFilesCount: number;
  oversizedAfterCompressionCount: number;
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
        const maxSizeInBytes = 300 * 1024;
        const compressed: File[] = [];
        let oversizedAfterCompressionCount = 0;
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
            const compressedFile = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1920 });
            if (compressedFile.size <= maxSizeInBytes) {
              compressed.push(compressedFile);
            } else {
              oversizedAfterCompressionCount += 1;
            }
          } catch {
            compressionErrorCount += 1;
          }
        }

        onFiles(compressed.slice(0, MAX_IMAGES_UPLOAD));
        onFeedback?.({
          invalidTypeCount,
          tooManyFilesCount,
          oversizedAfterCompressionCount,
          compressionErrorCount,
        });
      } finally {
        setIsProcessing(false);
      }
    },
  });

  return { getInputProps, getRootProps, isDragActive, isProcessing };
}
