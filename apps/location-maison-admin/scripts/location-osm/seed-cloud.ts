import fs from "node:fs";
import path from "node:path";

import { getFirebaseAdminStorage } from "@/lib/firebase/firebase-admin";

type CliOptions = {
  envFile?: string;
  sourceFile?: string;
  objectPath?: string;
  bucket?: string;
};

const DEFAULT_OBJECT_PATH = "reference-data/osm/gabon_osm.json";
const DEFAULT_SOURCE_FILE = path.resolve(
  process.cwd(),
  "..",
  "location-maison",
  "src",
  "data",
  "gabon_osm.json",
);

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (const arg of argv) {
    if (arg.startsWith("--env-file=")) {
      options.envFile = arg.slice("--env-file=".length).trim();
      continue;
    }
    if (arg.startsWith("--source-file=")) {
      options.sourceFile = arg.slice("--source-file=".length).trim();
      continue;
    }
    if (arg.startsWith("--object-path=")) {
      options.objectPath = arg.slice("--object-path=".length).trim();
      continue;
    }
    if (arg.startsWith("--bucket=")) {
      options.bucket = arg.slice("--bucket=".length).trim();
      continue;
    }
  }

  return options;
}

function unquote(value: string): string {
  if (value.length < 2) {
    return value;
  }

  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

function loadEnvFile(envFilePath: string): void {
  if (!fs.existsSync(envFilePath)) {
    return;
  }

  const content = fs.readFileSync(envFilePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || key.startsWith("#")) {
      continue;
    }
    if (process.env[key] !== undefined) {
      continue;
    }
    process.env[key] = unquote(rawValue);
  }
}

function resolveBucket(explicitBucket?: string) {
  return (
    explicitBucket?.trim() ||
    process.env.OSM_STORAGE_BUCKET?.trim() ||
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    null
  );
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const envFile = options.envFile ?? ".env.local";
  const envFilePath = path.resolve(process.cwd(), envFile);
  loadEnvFile(envFilePath);

  const sourceFile = path.resolve(process.cwd(), options.sourceFile ?? DEFAULT_SOURCE_FILE);
  const objectPath = options.objectPath?.trim() || process.env.OSM_STORAGE_OBJECT_PATH?.trim() || DEFAULT_OBJECT_PATH;
  const bucketName = resolveBucket(options.bucket);

  if (!bucketName) {
    throw new Error(
      "OSM bucket introuvable. Définis OSM_STORAGE_BUCKET ou FIREBASE_STORAGE_BUCKET (ou passe --bucket=...).",
    );
  }
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Fichier source OSM introuvable: ${sourceFile}`);
  }

  const payload = fs.readFileSync(sourceFile, "utf8");
  const parsed = JSON.parse(payload);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Le fichier source OSM n'est pas un objet JSON valide.");
  }

  const storage = getFirebaseAdminStorage();
  const file = storage.bucket(bucketName).file(objectPath);

  await file.save(payload, {
    resumable: false,
    contentType: "application/json; charset=utf-8",
    metadata: {
      cacheControl: "public, max-age=300",
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        sourceFile,
        target: `gs://${bucketName}/${objectPath}`,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[osm:seed:cloud] failed");
  console.error(error);
  process.exit(1);
});
