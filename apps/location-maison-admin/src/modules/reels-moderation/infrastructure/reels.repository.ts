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
