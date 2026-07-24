/**
 * Admin review for announcer auto-attribution batches blocked by MAX_AUTO_CLAIM
 * (see apps/location-maison's listing-claim.service.ts): a phone-verified
 * announcer matched more listings by `contact` than the auto-claim threshold
 * allows, so nothing was attached and a `listing_claim_reviews` document was
 * recorded instead. This service lists those pending reviews and lets an
 * admin approve (attach every matching, still-unclaimed listing to the
 * announcer, bypassing the threshold) or reject (dismiss, no attachment).
 */
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";
import { toIsoDate } from "@trouve-ton-nkama/core/utils";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type { ListingClaimReview, ListingClaimReviewStatus } from "../domain/types";

const REVIEWS_COLLECTION = COLLECTIONS.listing_claim_reviews;
const USERS_COLLECTION = COLLECTIONS.users;
const PROPERTIES_COLLECTION = COLLECTIONS.properties;

export class ListingClaimReviewError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ListingClaimReviewError";
  }
}

function mapReviewDoc(id: string, data: FirebaseFirestore.DocumentData, announcerLabel: string | null): ListingClaimReview {
  return {
    id,
    uid: typeof data.uid === "string" ? data.uid : "",
    verifiedPhone: typeof data.verifiedPhone === "string" ? data.verifiedPhone : "",
    matchCount: typeof data.matchCount === "number" ? data.matchCount : 0,
    status: (data.status as ListingClaimReviewStatus) ?? "pending",
    createdAt: toIsoDate(data.createdAt),
    lastAttemptAt: toIsoDate(data.lastAttemptAt),
    resolvedAt: toIsoDate(data.resolvedAt),
    resolvedBy: typeof data.resolvedBy === "string" ? data.resolvedBy : null,
    announcerLabel,
  };
}

export async function listPendingListingClaimReviews(): Promise<ListingClaimReview[]> {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(REVIEWS_COLLECTION).where("status", "==", "pending").get();

  return Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const uid = typeof data.uid === "string" ? data.uid : "";
      let announcerLabel: string | null = null;
      if (uid) {
        const userDoc = await db.collection(USERS_COLLECTION).doc(uid).get();
        const userData = userDoc.data();
        announcerLabel = userData
          ? [userData.firstname, userData.lastname].filter(Boolean).join(" ").trim() || userData.email || null
          : null;
      }
      return mapReviewDoc(doc.id, data, announcerLabel);
    }),
  );
}

async function getReviewOrThrow(reviewId: string) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(REVIEWS_COLLECTION).doc(reviewId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new ListingClaimReviewError("Revue introuvable.", "REVIEW_NOT_FOUND");
  }
  const data = snapshot.data() as FirebaseFirestore.DocumentData;
  if (data.status !== "pending") {
    throw new ListingClaimReviewError("Cette revue a déjà été traitée.", "REVIEW_ALREADY_RESOLVED");
  }
  return { db, ref, data };
}

/**
 * Approve: attach every still-unclaimed listing whose `contact` matches the
 * review's verified phone to its announcer, bypassing MAX_AUTO_CLAIM (an
 * admin has now vetted the batch).
 */
export async function approveListingClaimReview(reviewId: string, adminUid: string): Promise<{ claimedCount: number }> {
  const { db, ref, data } = await getReviewOrThrow(reviewId);
  const uid = data.uid as string;
  const verifiedPhone = data.verifiedPhone as string;

  const snapshot = await db.collection(PROPERTIES_COLLECTION).where("contact", "==", verifiedPhone).get();
  const candidates = snapshot.docs.filter((doc) => {
    const propertyData = doc.data();
    return propertyData.createdBy !== uid && !propertyData.claimedBy;
  });

  const batch = db.batch();
  for (const doc of candidates) {
    batch.update(doc.ref, { claimedBy: uid, claimedAt: FieldValue.serverTimestamp() });
  }
  batch.update(ref, {
    status: "approved",
    resolvedAt: FieldValue.serverTimestamp(),
    resolvedBy: adminUid,
  });
  await batch.commit();

  return { claimedCount: candidates.length };
}

/** Reject: dismiss the review without attaching anything. */
export async function rejectListingClaimReview(reviewId: string, adminUid: string): Promise<void> {
  const { ref } = await getReviewOrThrow(reviewId);
  await ref.update({
    status: "rejected",
    resolvedAt: FieldValue.serverTimestamp(),
    resolvedBy: adminUid,
  });
}
