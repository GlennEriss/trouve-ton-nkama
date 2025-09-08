// useImageDropzone.ts
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";

export function useImageDropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    maxFiles: 10,
    multiple: true,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    onDrop: async (acceptedFiles) => {
      const maxSizeInBytes = 300 * 1024;
      const compressed: File[] = [];

      for (const file of acceptedFiles) {
        const compressedFile = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1920 });
        if (compressedFile.size <= maxSizeInBytes) compressed.push(compressedFile);
      }

      onFiles(compressed.slice(0, 10));
    },
  });

  return { getInputProps, getRootProps, isDragActive };
}
