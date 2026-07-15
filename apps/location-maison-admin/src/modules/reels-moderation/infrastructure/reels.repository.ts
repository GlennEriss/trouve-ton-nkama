import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";
import { toIsoDate } from "@trouve-ton-nkama/core/utils";
import { resolveCursorSnapshot, sliceCursorPage } from "@/lib/firestore/pagination";
import type { ReelListItem, ReelRawDoc } from "@/modules/reels-moderation/domain/types";

const REELS_COLLECTION = COLLECTIONS.reels;

function mapReel(id: string, data: ReelRawDoc): ReelListItem {
  return {
    id,
    propertyId: data.propertyId,
    createdBy: data.createdBy,
    processingStatus: data.processingStatus,
    processingError: data.processingError ?? null,
    videoUrl: data.videoUrl ?? null,
    thumbnailUrl: data.thumbnailUrl ?? null,
    durationSeconds: data.durationSeconds ?? null,
    moderationStatus: data.moderationStatus,
    rejectionReason: data.rejectionReason ?? null,
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
  };
}

export async function listPendingReels(input: {
  limit: number;
  cursor?: string | null;
}): Promise<{ items: ReelListItem[]; hasMore: boolean; nextCursor: string | null }> {
  const db = getFirebaseAdminDb();
  const collectionRef = db.collection(REELS_COLLECTION);

  let query = collectionRef
    .where("moderationStatus", "==", "PENDING")
    .where("processingStatus", "==", "ready")
    .orderBy("createdAt", "asc")
    .limit(input.limit + 1);

  const cursorDoc = await resolveCursorSnapshot(collectionRef, input.cursor);
  if (cursorDoc) {
    query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  return sliceCursorPage(snapshot.docs, input.limit, (doc) => mapReel(doc.id, doc.data() as ReelRawDoc));
}

export async function getReelById(reelId: string): Promise<ReelListItem | null> {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(REELS_COLLECTION).doc(reelId).get();
  if (!snapshot.exists) {
    return null;
  }
  return mapReel(snapshot.id, snapshot.data() as ReelRawDoc);
}

export async function patchReelModerationStatus(
  reelId: string,
  input: {
    moderationStatus: "APPROVED" | "REJECTED";
    rejectionReason?: string | null;
    reviewedBy: string;
  },
): Promise<void> {
  const db = getFirebaseAdminDb();
  await db
    .collection(REELS_COLLECTION)
    .doc(reelId)
    .set(
      {
        moderationStatus: input.moderationStatus,
        rejectionReason: input.moderationStatus === "REJECTED" ? input.rejectionReason ?? null : null,
        moderationReviewedAt: FieldValue.serverTimestamp(),
        moderationReviewedBy: input.reviewedBy,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

// Cache applicatif de apps/location-maison/src/lib/cache/firestore-cache-store.ts
// (collection `_cache_entries`, clé = id de doc, ex. `reels:feed:10:first`) — pas de
// module partagé entre les deux apps, nom dupliqué volontairement (même pattern que
// COLLECTIONS ailleurs dans ce repo). Sans cette purge, un réel fraîchement approuvé
// reste invisible du fil public jusqu'à expiration du cache (TTL 10 min par défaut) si
// une requête a mis en cache une page vide pendant que le réel était encore en attente.
const CACHE_ENTRIES_COLLECTION = "_cache_entries";
const REELS_FEED_CACHE_PREFIX = "reels:feed:";

export async function invalidateReelsFeedCache(): Promise<void> {
  const db = getFirebaseAdminDb();
  // Requête par plage d'id de document = équivalent d'un "startsWith" Firestore
  // (borne haute = préfixe + caractère unicode \uF8FF, pattern standard).
  const snapshot = await db
    .collection(CACHE_ENTRIES_COLLECTION)
    .where("__name__", ">=", REELS_FEED_CACHE_PREFIX)
    .where("__name__", "<", `${REELS_FEED_CACHE_PREFIX}`)
    .get();

  if (snapshot.empty) {
    return;
  }

  const batch = db.batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
}
