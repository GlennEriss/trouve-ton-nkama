import "server-only";

import { adminApp } from "@/firebase/admin";
import { DEFAULT_TAG_NAMES } from "@/lib/tags/default-tags";

type TagDocument = {
  name?: unknown;
  isActive?: unknown;
  order?: unknown;
};

const TAG_COLLECTION = "listing_tags";
const CACHE_TTL_MS = 60_000;

type CacheState = {
  expiresAt: number;
  tagNames: string[];
} | null;

let cacheState: CacheState = null;

function toSafeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toSafeNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return fallback;
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

export async function getDynamicTagNamesServer(forceRefresh = false): Promise<string[]> {
  const now = Date.now();
  if (!forceRefresh && cacheState && cacheState.expiresAt > now) {
    return cacheState.tagNames;
  }

  try {
    const { getFirestore } = await import("firebase-admin/firestore");
    const db = getFirestore(adminApp as any);
    const snapshot = await db.collection(TAG_COLLECTION).get();

    const rows = snapshot.docs
      .map((doc) => {
        const data = doc.data() as TagDocument;
        const name = toSafeString(data.name);
        const isActive = typeof data.isActive === "boolean" ? data.isActive : true;
        const order = toSafeNumber(data.order, 0);
        return {
          name,
          isActive,
          order,
        };
      })
      .filter((row): row is { name: string; isActive: boolean; order: number } => Boolean(row.name) && row.isActive)
      .sort((left, right) => {
        if (left.order !== right.order) return left.order - right.order;
        return left.name.localeCompare(right.name, "fr");
      });

    const tagNames = dedupe(rows.map((row) => row.name));
    const resolved = tagNames.length > 0 ? tagNames : [...DEFAULT_TAG_NAMES];
    cacheState = {
      tagNames: resolved,
      expiresAt: now + CACHE_TTL_MS,
    };
    return resolved;
  } catch {
    const fallback = [...DEFAULT_TAG_NAMES];
    cacheState = {
      tagNames: fallback,
      expiresAt: now + CACHE_TTL_MS,
    };
    return fallback;
  }
}
