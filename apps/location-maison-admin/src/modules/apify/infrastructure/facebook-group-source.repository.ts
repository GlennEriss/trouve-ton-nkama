import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type {
  CreateFacebookGroupSourceInput,
  FacebookGroupSource,
  UpdateFacebookGroupSourceInput,
} from "@/modules/apify/domain/group-source.types";
import { normalizeFacebookGroupUrl } from "@/modules/apify/application/facebook-group-normalize.service";
import { toIsoDate } from "@trouve-ton-nkama/core/utils";

// Admin-only reference list, not shared with location-maison — same choice
// as `tag.repository.ts`'s `listing_tags`, no entry needed in the shared
// COLLECTIONS constant.
const COLLECTION = "apify_facebook_group_sources";

type FacebookGroupSourceDoc = {
  url?: unknown;
  canonicalKey?: unknown;
  label?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: unknown;
};

function toSafeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapDoc(id: string, data: FacebookGroupSourceDoc): FacebookGroupSource {
  return {
    id,
    url: toSafeString(data.url) ?? "",
    canonicalKey: toSafeString(data.canonicalKey) ?? "",
    label: toSafeString(data.label),
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
    createdBy: toSafeString(data.createdBy),
  };
}

function sortSources(items: FacebookGroupSource[]) {
  return [...items].sort((left, right) => (left.label ?? left.url).localeCompare(right.label ?? right.url, "fr"));
}

export async function listFacebookGroupSources() {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTION).get();
  const items = snapshot.docs.map((doc) => mapDoc(doc.id, doc.data() as FacebookGroupSourceDoc));
  return sortSources(items);
}

export async function createFacebookGroupSource(input: CreateFacebookGroupSourceInput) {
  const normalized = normalizeFacebookGroupUrl(input.url);
  if (!normalized) {
    throw new Error("GROUP_URL_INVALID");
  }

  const db = getFirebaseAdminDb();
  const duplicateSnapshot = await db
    .collection(COLLECTION)
    .where("canonicalKey", "==", normalized.canonicalKey)
    .limit(1)
    .get();

  if (!duplicateSnapshot.empty) {
    throw new Error("GROUP_ALREADY_EXISTS");
  }

  const ref = db.collection(COLLECTION).doc();
  await ref.set({
    url: normalized.canonicalUrl,
    canonicalKey: normalized.canonicalKey,
    label: input.label ?? null,
    createdBy: input.actorUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const saved = await ref.get();
  return mapDoc(saved.id, saved.data() as FacebookGroupSourceDoc);
}

export async function updateFacebookGroupSource(input: UpdateFacebookGroupSourceInput) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION).doc(input.groupId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return null;
  }

  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (typeof input.patch.url === "string") {
    const normalized = normalizeFacebookGroupUrl(input.patch.url);
    if (!normalized) {
      throw new Error("GROUP_URL_INVALID");
    }

    const duplicateSnapshot = await db
      .collection(COLLECTION)
      .where("canonicalKey", "==", normalized.canonicalKey)
      .limit(1)
      .get();

    if (!duplicateSnapshot.empty && duplicateSnapshot.docs[0].id !== input.groupId) {
      throw new Error("GROUP_ALREADY_EXISTS");
    }

    patch.url = normalized.canonicalUrl;
    patch.canonicalKey = normalized.canonicalKey;
  }

  if (typeof input.patch.label !== "undefined") {
    patch.label = input.patch.label;
  }

  await ref.set(patch, { merge: true });
  const updated = await ref.get();
  return mapDoc(updated.id, updated.data() as FacebookGroupSourceDoc);
}

export async function deleteFacebookGroupSource(groupId: string) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION).doc(groupId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return null;
  }

  const mapped = mapDoc(snapshot.id, snapshot.data() as FacebookGroupSourceDoc);
  await ref.delete();
  return mapped;
}
