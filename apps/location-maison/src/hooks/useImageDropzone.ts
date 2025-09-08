// useImageDropzone.ts
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { useState } from "react";
import { MAX_IMAGES_UPLOAD } from "@/constantes";

export function useImageDropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    maxFiles: MAX_IMAGES_UPLOAD,
    multiple: true,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      
      setIsProcessing(true);
      try {
        const maxSizeInBytes = 300 * 1024;
        const compressed: File[] = [];

        for (const file of acceptedFiles) {
          const compressedFile = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1920 });
          if (compressedFile.size <= maxSizeInBytes) compressed.push(compressedFile);
        }

        onFiles(compressed.slice(0, MAX_IMAGES_UPLOAD));
      } finally {
        setIsProcessing(false);
      }
    },
  });

  return { getInputProps, getRootProps, isDragActive, isProcessing };
}
