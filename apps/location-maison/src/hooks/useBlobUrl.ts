import { useMemo } from "react";

export function useBlobUrl(file?: File | null): string | null {
  return useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);
}
