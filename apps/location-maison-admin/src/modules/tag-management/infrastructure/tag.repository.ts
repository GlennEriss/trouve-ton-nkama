import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type {
  CreateListingTagInput,
  ListingTag,
  UpdateListingTagInput,
} from "@/modules/tag-management/domain/types";

const COLLECTION = "listing_tags";

type ListingTagDoc = {
  name?: unknown;
  nameLower?: unknown;
  isActive?: unknown;
  order?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
};

function toIsoDate(value: unknown): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
}

function toSafeString(value: unknown): string | null {
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

function mapDoc(id: string, data: ListingTagDoc): ListingTag {
  return {
    id,
    name: toSafeString(data.name) ?? id,
    isActive: typeof data.isActive === "boolean" ? data.isActive : true,
    order: Math.max(0, toSafeNumber(data.order, 0)),
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
    createdBy: toSafeString(data.createdBy),
    updatedBy: toSafeString(data.updatedBy),
  };
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function sortTags(items: ListingTag[]) {
  return [...items].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }
    return left.name.localeCompare(right.name, "fr");
  });
}

export async function listListingTags() {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTION).get();
  const items = snapshot.docs.map((doc) => mapDoc(doc.id, doc.data() as ListingTagDoc));
  return sortTags(items);
}

export async function getListingTagById(tagId: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTION).doc(tagId).get();
  if (!snapshot.exists) {
    return null;
  }
  return mapDoc(snapshot.id, snapshot.data() as ListingTagDoc);
}

export async function createListingTag(input: CreateListingTagInput) {
  const db = getFirebaseAdminDb();
  const normalized = normalizeName(input.name);

  const duplicateSnapshot = await db
    .collection(COLLECTION)
    .where("nameLower", "==", normalized)
    .limit(1)
    .get();

  if (!duplicateSnapshot.empty) {
    throw new Error("TAG_ALREADY_EXISTS");
  }

  const ref = db.collection(COLLECTION).doc();
  await ref.set({
    name: input.name,
    nameLower: normalized,
    isActive: input.isActive ?? true,
    order: Math.max(0, Math.trunc(input.order ?? 0)),
    createdBy: input.actorUid,
    updatedBy: input.actorUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const saved = await ref.get();
  return mapDoc(saved.id, saved.data() as ListingTagDoc);
}

export async function updateListingTag(input: UpdateListingTagInput) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION).doc(input.tagId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return null;
  }

  const patch: Record<string, unknown> = {
    updatedBy: input.actorUid,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (typeof input.patch.name === "string") {
    const normalized = normalizeName(input.patch.name);
    const duplicateSnapshot = await db
      .collection(COLLECTION)
      .where("nameLower", "==", normalized)
      .limit(1)
      .get();

    if (!duplicateSnapshot.empty && duplicateSnapshot.docs[0].id !== input.tagId) {
      throw new Error("TAG_ALREADY_EXISTS");
    }

    patch.name = input.patch.name;
    patch.nameLower = normalized;
  }

  if (typeof input.patch.isActive === "boolean") {
    patch.isActive = input.patch.isActive;
  }

  if (typeof input.patch.order === "number") {
    patch.order = Math.max(0, Math.trunc(input.patch.order));
  }

  await ref.set(patch, { merge: true });
  const updated = await ref.get();
  return mapDoc(updated.id, updated.data() as ListingTagDoc);
}

export async function deleteListingTag(tagId: string) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION).doc(tagId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return null;
  }

  const mapped = mapDoc(snapshot.id, snapshot.data() as ListingTagDoc);
  await ref.delete();
  return mapped;
}
