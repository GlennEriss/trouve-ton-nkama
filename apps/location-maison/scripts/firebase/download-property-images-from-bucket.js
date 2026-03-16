#!/usr/bin/env node
"use strict";

/**
 * Download property-related images from Firebase Storage bucket.
 *
 * Usage:
 * node scripts/firebase/download-property-images-from-bucket.js \
 *   --env-file /abs/path/.env.local.prod \
 *   --output-dir /abs/path/retouche-photo-ia/data/raw/clean_real_estate_prod \
 *   --manifest /abs/path/retouche-photo-ia/data/raw/clean_real_estate_prod_manifest.csv \
 *   --prefix properties/ \
 *   --max-files 12000 \
 *   --min-size-kb 20 \
 *   --concurrency 8
 */

const fs = require("node:fs");
const path = require("node:path");
const admin = require("firebase-admin");
const dotenv = require("dotenv");

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
  ".heic",
  ".heif",
]);

function parseArgs(argv) {
  const result = {
    envFile: "",
    outputDir: "",
    manifest: "",
    prefix: "properties/",
    maxFiles: 10000,
    minSizeKb: 20,
    concurrency: 8,
    overwrite: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--env-file") result.envFile = argv[++i] || "";
    else if (arg === "--output-dir") result.outputDir = argv[++i] || "";
    else if (arg === "--manifest") result.manifest = argv[++i] || "";
    else if (arg === "--prefix") result.prefix = argv[++i] || "properties/";
    else if (arg === "--max-files") result.maxFiles = Number(argv[++i] || 10000);
    else if (arg === "--min-size-kb") result.minSizeKb = Number(argv[++i] || 20);
    else if (arg === "--concurrency") result.concurrency = Number(argv[++i] || 8);
    else if (arg === "--overwrite") result.overwrite = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return result;
}

function printHelp() {
  console.log(`Download property images from Firebase Storage.

Required:
  --output-dir <path>   Local destination directory

Optional:
  --env-file <path>     .env file path (default: ../../.env.local.prod)
  --manifest <path>     CSV export path (default: <output-dir>_manifest.csv)
  --prefix <value>      Storage prefix (default: properties/)
  --max-files <n>       Max files to download (default: 10000)
  --min-size-kb <n>     Minimum object size in KB (default: 20)
  --concurrency <n>     Parallel downloads (default: 8)
  --overwrite           Force re-download existing files
`);
}

function csvEscape(value) {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
    return `"${raw.replace(/"/g, "\"\"")}"`;
  }
  return raw;
}

function toPublicUrl(bucketName, objectName) {
  const encoded = objectName
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://storage.googleapis.com/${bucketName}/${encoded}`;
}

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function listCandidateFiles(bucket, options) {
  const minSizeBytes = Math.max(0, Math.floor(options.minSizeKb * 1024));
  const out = [];
  let pageToken = undefined;
  let page = 0;

  while (out.length < options.maxFiles) {
    // Page-by-page listing avoids loading huge buckets in memory.
    const [files, nextQuery] = await bucket.getFiles({
      prefix: options.prefix,
      autoPaginate: false,
      maxResults: 1000,
      pageToken,
    });

    page += 1;
    let acceptedInPage = 0;

    for (const file of files) {
      if (!file || !file.name || file.name.endsWith("/")) continue;
      const ext = path.extname(file.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) continue;

      const size = Number(file.metadata?.size || 0);
      if (!Number.isFinite(size) || size < minSizeBytes) continue;

      out.push({
        name: file.name,
        size,
        contentType: file.metadata?.contentType || "",
        updated: file.metadata?.updated || "",
      });
      acceptedInPage += 1;

      if (out.length >= options.maxFiles) break;
    }

    console.log(
      `Page ${page}: ${files.length} objects scanned, ${acceptedInPage} kept (total kept: ${out.length})`
    );

    pageToken = nextQuery && nextQuery.pageToken ? nextQuery.pageToken : undefined;
    if (!pageToken) break;
  }

  return out;
}

async function runWorkerPool(items, workerFn, concurrency) {
  const safeConcurrency = Math.max(1, Math.floor(concurrency || 1));
  let index = 0;
  const workers = Array.from({ length: safeConcurrency }, async () => {
    while (true) {
      const currentIndex = index;
      index += 1;
      if (currentIndex >= items.length) return;
      // eslint-disable-next-line no-await-in-loop
      await workerFn(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.outputDir) {
    printHelp();
    throw new Error("Missing required argument: --output-dir");
  }

  const envFile = args.envFile
    ? path.resolve(args.envFile)
    : path.resolve(__dirname, "..", "..", ".env.local.prod");

  const dotenvRes = dotenv.config({ path: envFile });
  if (dotenvRes.error) {
    throw new Error(`Cannot load env file: ${envFile} (${dotenvRes.error.message})`);
  }

  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "";
  if (!bucketName) {
    throw new Error("Missing FIREBASE_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in env");
  }

  const serviceAccount = require("./firebase-config.js");
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error("Firebase Admin credentials are incomplete in environment variables");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: bucketName,
    });
  }

  const outputDir = path.resolve(args.outputDir);
  const manifestPath = args.manifest
    ? path.resolve(args.manifest)
    : path.resolve(`${outputDir}_manifest.csv`);

  await ensureDir(outputDir);
  await ensureDir(path.dirname(manifestPath));

  const bucket = admin.storage().bucket(bucketName);

  console.log(`Listing objects from bucket: ${bucketName}`);
  console.log(`Prefix: ${args.prefix}`);
  const candidates = await listCandidateFiles(bucket, args);
  console.log(`Candidate images to download: ${candidates.length}`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  const rows = [];
  const startTs = Date.now();

  await runWorkerPool(
    candidates,
    async (item, idx) => {
      const relPath = item.name.replace(/^\/+/, "");
      const localPath = path.join(outputDir, relPath);

      try {
        await ensureDir(path.dirname(localPath));
        if (!args.overwrite && fs.existsSync(localPath)) {
          skipped += 1;
          rows.push({
            bucket_path: item.name,
            local_path: localPath,
            size_bytes: item.size,
            content_type: item.contentType,
            updated: item.updated,
            status: "skipped_existing",
            url: toPublicUrl(bucketName, item.name),
          });
        } else {
          await bucket.file(item.name).download({ destination: localPath });
          downloaded += 1;
          rows.push({
            bucket_path: item.name,
            local_path: localPath,
            size_bytes: item.size,
            content_type: item.contentType,
            updated: item.updated,
            status: "downloaded",
            url: toPublicUrl(bucketName, item.name),
          });
        }
      } catch (error) {
        failed += 1;
        rows.push({
          bucket_path: item.name,
          local_path: localPath,
          size_bytes: item.size,
          content_type: item.contentType,
          updated: item.updated,
          status: "failed",
          url: toPublicUrl(bucketName, item.name),
          error: error && error.message ? error.message : String(error),
        });
      }

      if ((idx + 1) % 100 === 0 || idx + 1 === candidates.length) {
        const elapsedSec = ((Date.now() - startTs) / 1000).toFixed(1);
        console.log(
          `Progress ${idx + 1}/${candidates.length} | downloaded=${downloaded} skipped=${skipped} failed=${failed} | ${elapsedSec}s`
        );
      }
    },
    args.concurrency
  );

  const header = [
    "bucket_path",
    "local_path",
    "size_bytes",
    "content_type",
    "updated",
    "status",
    "url",
    "error",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(header.map((key) => csvEscape(row[key] ?? "")).join(","));
  }
  await fs.promises.writeFile(manifestPath, `${lines.join("\n")}\n`, "utf8");

  const summary = {
    bucket: bucketName,
    prefix: args.prefix,
    total_candidates: candidates.length,
    downloaded,
    skipped,
    failed,
    output_dir: outputDir,
    manifest: manifestPath,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("Failed:", error && error.message ? error.message : error);
  process.exitCode = 1;
});
