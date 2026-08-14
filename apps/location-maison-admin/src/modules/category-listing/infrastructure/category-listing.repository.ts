import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type { CategoryListingAttributeValue } from "@/modules/category-listing/domain/types";

const COLLECTION = "properties";

export async function createCategoryListingDocument(input: {
  categoryId: string;
  categoryPath: { lvl0: string; lvl1: string };
  attributes: Record<string, CategoryListingAttributeValue>;
  title: string;
  description: string;
  price: number;
  province: string;
  city: string;
  latitude: number;
  longitude: number;
  images: Array<{ fileURL: string; filePATH: string }>;
  contact: string;
  whatsappContact?: string;
  callContact?: string;
  announcerUid: string;
  actorUid: string;
}) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION).doc();

  await ref.set({
    title: input.title,
    description: input.description,
    price: input.price,
    images: input.images,
    categoryId: input.categoryId,
    categoryPath: input.categoryPath,
    attributes: input.attributes,
    street: "",
    city: input.city,
    province: input.province,
    country: "Gabon",
    countryCode: "GA",
    latitude: input.latitude,
    longitude: input.longitude,
    isLocExact: false,
    locationSource: "UNVERIFIED",
    contact: input.contact,
    whatsappContact: input.whatsappContact ?? null,
    callContact: input.callContact ?? null,
    createdBy: input.announcerUid,
    searchableName: input.title.trim().toLowerCase(),
    // Toujours PENDING, y compris pour une saisie admin : contrairement au parcours
    // immobilier admin existant (auto-APPROVED), une annonce multi-catégorie ne doit
    // jamais sortir en public par accident tant que le Lot 5 (accueil/recherche par
    // catégorie) n'a pas isolé ces annonces des sections immobilier existantes —
    // /api/property/list (carrousel "Récentes") sert TOUT ce qui est APPROVED, sans
    // filtre de catégorie. Voir docs/marketplace-multi-categories/07-lots-et-sequencement.md.
    moderationStatus: "PENDING",
    moderationReviewedAt: null,
    moderationReviewedBy: null,
    rejectionReason: null,
    state: "IN_PROGRESS",
    tags: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return ref.id;
}

export type CategoryListingSummary = {
  id: string;
  title: string;
  price: number;
  categoryId: string;
  categoryPath: { lvl0: string; lvl1: string } | null;
  moderationStatus: string;
  rejectionReason: string | null;
  city: string;
  province: string;
  createdBy: string;
  createdAt: string | null;
  primaryImageUrl: string | null;
};

/**
 * Toutes les annonces multi-catégorie (categoryId présent — donc jamais immobilier tant
 * que le backfill du Lot 1 n'a pas tourné). Une seule égalité (`!=` sur un champ, seule
 * dans la requête) : pas de composite index Firestore requis, voir la même précaution
 * dans home-sections/route.ts côté location-maison.
 */
export async function listCategoryListingDocuments(): Promise<CategoryListingSummary[]> {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTION).where("categoryId", "!=", null).limit(200).get();

  const items = snapshot.docs.map((doc) => {
    const data = doc.data();
    const images = Array.isArray(data.images) ? data.images : [];
    const firstImage = images.find((image: unknown) => {
      if (typeof image === "string") return image.trim().length > 0;
      if (image && typeof image === "object") {
        const url = (image as { fileURL?: unknown }).fileURL;
        return typeof url === "string" && url.trim().length > 0;
      }
      return false;
    });
    const primaryImageUrl =
      typeof firstImage === "string" ? firstImage : (firstImage as { fileURL?: string } | undefined)?.fileURL ?? null;

    return {
      id: doc.id,
      title: typeof data.title === "string" ? data.title : "",
      price: typeof data.price === "number" ? data.price : 0,
      categoryId: typeof data.categoryId === "string" ? data.categoryId : "",
      categoryPath:
        data.categoryPath && typeof data.categoryPath === "object"
          ? { lvl0: String(data.categoryPath.lvl0 ?? ""), lvl1: String(data.categoryPath.lvl1 ?? "") }
          : null,
      moderationStatus: typeof data.moderationStatus === "string" ? data.moderationStatus : "PENDING",
      rejectionReason: typeof data.rejectionReason === "string" ? data.rejectionReason : null,
      city: typeof data.city === "string" ? data.city : "",
      province: typeof data.province === "string" ? data.province : "",
      createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
      createdAt:
        data.createdAt && typeof data.createdAt.toDate === "function" ? data.createdAt.toDate().toISOString() : null,
      primaryImageUrl,
    } satisfies CategoryListingSummary;
  });

  return items.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}
