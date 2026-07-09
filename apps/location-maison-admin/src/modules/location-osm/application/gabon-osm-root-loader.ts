import { existsSync, readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

import { getFirebaseAdminStorage } from "@/lib/firebase/firebase-admin";

type OsmRecord = Record<string, unknown>;

export type GabonOsmRootSource = {
  mode: "cloud" | "local";
  sourcePath: string;
  sourceBucket: string | null;
  sourceObjectPath: string | null;
  sourceUpdatedAt: string | null;
};

export type GabonOsmRootResult = {
  root: OsmRecord;
  source: GabonOsmRootSource;
};

const DEFAULT_OSM_OBJECT_PATH = "reference-data/osm/gabon_osm.json";
const DEFAULT_SOURCE_CACHE_TTL_MS = 5 * 60 * 1000;

const LOCAL_GABON_OSM_JSON_PATH =
  process.env.LISTINGS_OSM_JSON_PATH?.trim() ||
  process.env.SOCIAL_IMPORT_OSM_JSON_PATH?.trim() ||
  resolvePath(
    /* turbopackIgnore: true */ process.cwd(),
    "..",
    "location-maison",
    "src",
    "data",
    "gabon_osm.json",
  );

const OSM_STORAGE_BUCKET =
  process.env.OSM_STORAGE_BUCKET?.trim() ||
  process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
  null;

const OSM_STORAGE_OBJECT_PATH =
  process.env.OSM_STORAGE_OBJECT_PATH?.trim() || DEFAULT_OSM_OBJECT_PATH;

const OSM_SOURCE_CACHE_TTL_MS = Number(
  process.env.OSM_SOURCE_CACHE_TTL_MS ?? DEFAULT_SOURCE_CACHE_TTL_MS,
);

const OSM_STORAGE_PREFER_CLOUD = !["0", "false", "no"].includes(
  (process.env.OSM_STORAGE_PREFER_CLOUD ?? "true").trim().toLowerCase(),
);

type CacheState = {
  expiresAt: number;
  data: GabonOsmRootResult | null;
} | null;

let cacheState: CacheState = null;
let loadingPromise: Promise<GabonOsmRootResult | null> | null = null;

function toOsmRecord(value: unknown): OsmRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as OsmRecord;
}

function parseJsonRoot(text: string) {
  const parsed = JSON.parse(text) as unknown;
  return toOsmRecord(parsed);
}

function loadFromLocalFile(): GabonOsmRootResult | null {
  if (!existsSync(LOCAL_GABON_OSM_JSON_PATH)) {
    return null;
  }
  const text = readFileSync(LOCAL_GABON_OSM_JSON_PATH, "utf8");
  const root = parseJsonRoot(text);
  if (!root) {
    return null;
  }
  return {
    root,
    source: {
      mode: "local",
      sourcePath: LOCAL_GABON_OSM_JSON_PATH,
      sourceBucket: null,
      sourceObjectPath: null,
      sourceUpdatedAt: null,
    },
  };
}

async function loadFromCloudStorage(): Promise<GabonOsmRootResult | null> {
  if (!OSM_STORAGE_BUCKET) {
    return null;
  }

  const storage = getFirebaseAdminStorage();
  const file = storage.bucket(OSM_STORAGE_BUCKET).file(OSM_STORAGE_OBJECT_PATH);
  const [exists] = await file.exists();
  if (!exists) {
    return null;
  }

  const [buffer, metadata] = await Promise.all([
    file.download().then(([contents]) => contents),
    file.getMetadata().then(([value]) => value).catch(() => null),
  ]);

  const root = parseJsonRoot(buffer.toString("utf8"));
  if (!root) {
    return null;
  }

  return {
    root,
    source: {
      mode: "cloud",
      sourcePath: `gs://${OSM_STORAGE_BUCKET}/${OSM_STORAGE_OBJECT_PATH}`,
      sourceBucket: OSM_STORAGE_BUCKET,
      sourceObjectPath: OSM_STORAGE_OBJECT_PATH,
      sourceUpdatedAt: typeof metadata?.updated === "string" ? metadata.updated : null,
    },
  };
}

async function resolveRootSource() {
  const attempts = OSM_STORAGE_PREFER_CLOUD
    ? [loadFromCloudStorage, async () => loadFromLocalFile()]
    : [async () => loadFromLocalFile(), loadFromCloudStorage];

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result) {
        return result;
      }
    } catch {
      // On continue vers le fallback suivant.
    }
  }
  return null;
}

export async function loadGabonOsmRoot(forceRefresh = false): Promise<GabonOsmRootResult | null> {
  const now = Date.now();
  if (!forceRefresh && cacheState && cacheState.expiresAt > now) {
    return cacheState.data;
  }

  if (!forceRefresh && loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = resolveRootSource()
    .then((result) => {
      cacheState = {
        data: result,
        expiresAt: Date.now() + Math.max(5_000, OSM_SOURCE_CACHE_TTL_MS),
      };
      return result;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}
