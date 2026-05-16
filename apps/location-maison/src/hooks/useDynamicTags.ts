"use client";

import { useEffect, useMemo, useState } from "react";

import { mapTagNamesToOptions, tags as fallbackTags } from "@/constantes";

type TagsApiPayload = {
  success: boolean;
  tags?: string[];
};

export function useDynamicTags() {
  const [tagNames, setTagNames] = useState<string[]>(fallbackTags.map((tag) => tag.tagName));

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/tags", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as TagsApiPayload;
        if (!payload.success || !Array.isArray(payload.tags)) {
          return;
        }
        const normalized = Array.from(
          new Set(
            payload.tags
              .map((value) => (typeof value === "string" ? value.trim() : ""))
              .filter(Boolean),
          ),
        );
        if (!cancelled && normalized.length > 0) {
          setTagNames(normalized);
        }
      } catch {
        // On garde le fallback statique en cas d'erreur réseau.
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const tagOptions = useMemo(() => mapTagNamesToOptions(tagNames), [tagNames]);

  return {
    tagNames,
    tagOptions,
  };
}
