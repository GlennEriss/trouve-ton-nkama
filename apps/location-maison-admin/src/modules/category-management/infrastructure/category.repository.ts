import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type {
  CategoryAttributeSchemaField,
  CategoryPromotionPricing,
  CreateListingCategoryInput,
  ListingCategory,
  PromotionType,
  UpdateListingCategoryInput,
} from "@/modules/category-management/domain/types";
import { toIsoDate } from "@trouve-ton-nkama/core/utils";

const COLLECTION = "listing_categories";

type ListingCategoryDoc = {
  parentId?: unknown;
  slug?: unknown;
  name?: unknown;
  icon?: unknown;
  order?: unknown;
  isActive?: unknown;
  attributeSchema?: unknown;
  imageRatio?: unknown;
  locationPrecision?: unknown;
  hasMapView?: unknown;
  defaultDensity?: unknown;
  defaultSort?: unknown;
  minListingsForHomeSection?: unknown;
  promotionPricing?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
};

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

function toSafeAttributeSchema(value: unknown): CategoryAttributeSchemaField[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry): CategoryAttributeSchemaField | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const raw = entry as Record<string, unknown>;
      const key = toSafeString(raw.key);
      const label = toSafeString(raw.label);
      const type = raw.type;
      if (!key || !label || (type !== "text" && type !== "number" && type !== "enum" && type !== "boolean")) {
        return null;
      }
      return {
        key,
        label,
        type,
        options: Array.isArray(raw.options) ? raw.options.filter((o): o is string => typeof o === "string") : undefined,
        required: raw.required === true,
        facetable: raw.facetable === true,
        searchable: raw.searchable === true,
        showOnCard: raw.showOnCard === true,
        primary: raw.primary === true,
      };
    })
    .filter((field): field is CategoryAttributeSchemaField => field !== null);
}

const PROMOTION_TYPES: PromotionType[] = ["featured", "trending-7d", "trending-3d", "boost"];

function toSafePromotionPricing(value: unknown): CategoryPromotionPricing {
  if (!value || typeof value !== "object") {
    return {};
  }
  const raw = value as Record<string, unknown>;
  const result: CategoryPromotionPricing = {};
  for (const type of PROMOTION_TYPES) {
    const entry = raw[type];
    if (!entry || typeof entry !== "object") continue;
    const entryRaw = entry as Record<string, unknown>;
    const credits = toSafeNumber(entryRaw.credits, -1);
    const duration = toSafeNumber(entryRaw.duration, -1);
    if (credits < 0 || duration < 0) continue;
    result[type] = { credits, duration };
  }
  return result;
}

function mapDoc(id: string, data: ListingCategoryDoc): ListingCategory {
  return {
    id,
    parentId: toSafeString(data.parentId),
    slug: toSafeString(data.slug) ?? id,
    name: toSafeString(data.name) ?? id,
    icon: toSafeString(data.icon),
    order: Math.max(0, toSafeNumber(data.order, 0)),
    isActive: typeof data.isActive === "boolean" ? data.isActive : false,
    attributeSchema: toSafeAttributeSchema(data.attributeSchema),
    imageRatio: data.imageRatio === "1:1" || data.imageRatio === "4:5" ? data.imageRatio : "4:3",
    locationPrecision:
      data.locationPrecision === "exact" || data.locationPrecision === "none" ? data.locationPrecision : "city",
    hasMapView: data.hasMapView === true,
    defaultDensity:
      data.defaultDensity === "showcase" || data.defaultDensity === "compact" ? data.defaultDensity : "standard",
    defaultSort: toSafeString(data.defaultSort) ?? "relevance",
    minListingsForHomeSection: Math.max(0, toSafeNumber(data.minListingsForHomeSection, 12)),
    promotionPricing: toSafePromotionPricing(data.promotionPricing),
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
    createdBy: toSafeString(data.createdBy),
    updatedBy: toSafeString(data.updatedBy),
  };
}

function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sortCategories(items: ListingCategory[]) {
  return [...items].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }
    return left.name.localeCompare(right.name, "fr");
  });
}

export async function listListingCategories() {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTION).get();
  const items = snapshot.docs.map((doc) => mapDoc(doc.id, doc.data() as ListingCategoryDoc));
  return sortCategories(items);
}

export async function getListingCategoryById(categoryId: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTION).doc(categoryId).get();
  if (!snapshot.exists) {
    return null;
  }
  return mapDoc(snapshot.id, snapshot.data() as ListingCategoryDoc);
}

export async function findListingCategoryBySlug(slug: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTION).where("slug", "==", slug).limit(1).get();
  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0];
  return mapDoc(doc.id, doc.data() as ListingCategoryDoc);
}

export async function countChildCategories(parentId: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTION).where("parentId", "==", parentId).limit(1).get();
  return snapshot.size;
}

export { normalizeSlug };

export async function createListingCategory(input: CreateListingCategoryInput) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION).doc();
  await ref.set({
    parentId: input.parentId,
    slug: input.slug,
    name: input.name,
    icon: input.icon ?? null,
    order: Math.max(0, Math.trunc(input.order ?? 0)),
    isActive: input.isActive ?? false,
    attributeSchema: input.attributeSchema ?? [],
    imageRatio: input.imageRatio ?? "4:3",
    locationPrecision: input.locationPrecision ?? "city",
    hasMapView: input.hasMapView ?? false,
    defaultDensity: input.defaultDensity ?? "standard",
    defaultSort: input.defaultSort ?? "relevance",
    minListingsForHomeSection: Math.max(0, Math.trunc(input.minListingsForHomeSection ?? 12)),
    promotionPricing: input.promotionPricing ?? {},
    createdBy: input.actorUid,
    updatedBy: input.actorUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const saved = await ref.get();
  return mapDoc(saved.id, saved.data() as ListingCategoryDoc);
}

export async function updateListingCategory(input: UpdateListingCategoryInput) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION).doc(input.categoryId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return null;
  }

  const patch: Record<string, unknown> = {
    updatedBy: input.actorUid,
    updatedAt: FieldValue.serverTimestamp(),
  };

  for (const [key, value] of Object.entries(input.patch)) {
    if (value !== undefined) {
      patch[key] = value;
    }
  }

  await ref.set(patch, { merge: true });
  const updated = await ref.get();
  return mapDoc(updated.id, updated.data() as ListingCategoryDoc);
}

export async function deleteListingCategory(categoryId: string) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION).doc(categoryId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return null;
  }

  const mapped = mapDoc(snapshot.id, snapshot.data() as ListingCategoryDoc);
  await ref.delete();
  return mapped;
}
