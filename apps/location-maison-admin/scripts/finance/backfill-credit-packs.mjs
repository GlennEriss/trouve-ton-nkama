#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function loadEnvFile(filePath) {
  if (!filePath) {
    return;
  }

  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Env file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, "utf8");
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
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const args = {
    envFile: null,
    serviceAccountFile: null,
    collection: "credit_packs",
    apply: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--env-file") {
      args.envFile = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === "--service-account-file") {
      args.serviceAccountFile = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === "--collection") {
      args.collection = argv[index + 1] ?? "credit_packs";
      index += 1;
      continue;
    }
    if (arg === "--apply") {
      args.apply = true;
      continue;
    }
  }

  return args;
}

function readServiceAccountFile(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Service account file not found: ${absolutePath}`);
  }
  const raw = fs.readFileSync(absolutePath, "utf8");
  return JSON.parse(raw);
}

function resolveFirebaseCredentials(serviceAccountFileArg) {
  const fileFromEnv =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT_FILE ||
    null;
  const explicitFile = serviceAccountFileArg || fileFromEnv;

  if (explicitFile) {
    const json = readServiceAccountFile(explicitFile);
    return {
      source: "service_account_file",
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GCP_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        json.project_id,
      clientEmail: json.client_email,
      privateKey: json.private_key,
    };
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/gm, "\n") : null;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase credentials. Provide --service-account-file or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.",
    );
  }

  return {
    source: "env",
    projectId,
    clientEmail,
    privateKey,
  };
}

function toTrimmedString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function humanizeId(id) {
  return id
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

const CANONICAL_PACKS = {
  starter: {
    name: "Starter",
    credits: 5,
    price: 2000,
    savings: null,
    order: 1,
    isActive: true,
  },
  standard: {
    name: "Standard",
    credits: 10,
    price: 3500,
    savings: 12.5,
    order: 2,
    isActive: true,
  },
  advanced: {
    name: "Avancé",
    credits: 25,
    price: 7500,
    savings: 25,
    order: 3,
    isActive: true,
  },
  premium: {
    name: "Premium",
    credits: 50,
    price: 12500,
    savings: 37.5,
    order: 4,
    isActive: true,
  },
};

function computePatch(input) {
  const { docId, data, fallbackOrder } = input;
  const normalizedId = docId.trim().toLowerCase();
  const canonical = CANONICAL_PACKS[normalizedId] ?? null;
  const patch = {};

  const name = toTrimmedString(data.name);
  if (!name) {
    patch.name = canonical?.name ?? humanizeId(docId);
  }

  const creditsNum = toFiniteNumber(data.credits);
  const creditsInt = creditsNum == null ? null : Math.trunc(creditsNum);
  if (creditsInt == null || creditsInt <= 0 || typeof data.credits !== "number") {
    patch.credits = canonical?.credits ?? Math.max(1, creditsInt ?? 1);
  }

  const priceNum = toFiniteNumber(data.price);
  const priceInt = priceNum == null ? null : Math.round(priceNum);
  if (priceInt == null || priceInt < 0 || typeof data.price !== "number") {
    patch.price = canonical?.price ?? Math.max(0, priceInt ?? 0);
  }

  const orderNum = toFiniteNumber(data.order);
  const orderInt = orderNum == null ? null : Math.trunc(orderNum);
  if (orderInt == null || orderInt < 0 || typeof data.order !== "number") {
    patch.order = canonical?.order ?? fallbackOrder;
  }

  if (typeof data.isActive !== "boolean") {
    patch.isActive = canonical?.isActive ?? true;
  }

  if (Object.keys(patch).length === 0) {
    return null;
  }

  return patch;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.envFile && !args.envFile.trim()) {
    throw new Error("Missing value for --env-file");
  }
  if (args.serviceAccountFile && !args.serviceAccountFile.trim()) {
    throw new Error("Missing value for --service-account-file");
  }

  loadEnvFile(args.envFile);

  const credentials = resolveFirebaseCredentials(args.serviceAccountFile);
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: credentials.projectId,
        clientEmail: credentials.clientEmail,
        privateKey: credentials.privateKey,
      }),
      projectId: credentials.projectId,
    });
  }

  const db = getFirestore();
  const collectionName = args.collection || "credit_packs";
  const snapshot = await db.collection(collectionName).get();
  const docs = [...snapshot.docs].sort((left, right) => left.id.localeCompare(right.id));

  console.log(
    `Backfill packs start | project=${credentials.projectId} collection=${collectionName} mode=${args.apply ? "apply" : "dry-run"} auth=${credentials.source}`,
  );
  console.log(`Documents found: ${docs.length}`);

  if (docs.length === 0) {
    console.log("No documents to process.");
    return;
  }

  const plannedUpdates = [];
  docs.forEach((doc, index) => {
    const patch = computePatch({
      docId: doc.id,
      data: doc.data() ?? {},
      fallbackOrder: index + 1,
    });
    if (!patch) {
      return;
    }
    plannedUpdates.push({
      ref: doc.ref,
      docId: doc.id,
      patch,
    });
  });

  console.log(`Packs requiring update: ${plannedUpdates.length}`);
  plannedUpdates.forEach((entry) => {
    console.log(`- ${entry.docId}: ${JSON.stringify(entry.patch)}`);
  });

  if (!args.apply) {
    console.log("Dry-run complete. Re-run with --apply to persist updates.");
    return;
  }

  let updatedCount = 0;
  while (updatedCount < plannedUpdates.length) {
    const chunk = plannedUpdates.slice(updatedCount, updatedCount + 400);
    const batch = db.batch();
    for (const item of chunk) {
      batch.set(
        item.ref,
        {
          ...item.patch,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: "system_backfill_credit_packs",
        },
        { merge: true },
      );
    }
    await batch.commit();
    updatedCount += chunk.length;
    console.log(`Applied ${updatedCount}/${plannedUpdates.length}`);
  }

  console.log("Backfill packs complete.");
}

main().catch((error) => {
  console.error("Backfill packs failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

