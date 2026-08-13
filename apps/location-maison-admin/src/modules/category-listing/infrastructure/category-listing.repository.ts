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
