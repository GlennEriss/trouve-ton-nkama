/**
 * Announcer auto-attribution (Lot 4b): reconcile listings whose `contact`
 * matches a phone number the visitor just proved ownership of (Firebase Phone
 * Auth OTP) with their account, so they see those listings under "mes
 * annonces" without any manual claim flow.
 *
 * Ownership model is additive, not destructive: `createdBy` (often the admin,
 * via the Apify import) is left untouched; a matched listing instead gets
 * `claimedBy`/`claimedAt`, and both fields grant access (co-managed: the
 * announcer can edit/mark rented-sold, the admin keeps moderation/publishing).
 *
 * Security note: OTP verification is proof of phone possession, which is why
 * this attaches automatically rather than requiring admin review — but a
 * shared/mistyped `contact` could otherwise mass-attach many listings to the
 * wrong account, so a batch above MAX_AUTO_CLAIM is skipped entirely, logged,
 * and recorded in `listing_claim_reviews` (COLLECTIONS.listing_claim_reviews)
 * for an admin to approve or reject from location-maison-admin.
 */

import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { createLogger } from '@/lib/logger';

const logger = createLogger('announcer.listing-claim.service');

// Above this many matches for one phone number, auto-attaching is more likely
// to be a shared/mistyped `contact` than a genuine multi-listing announcer.
export const MAX_AUTO_CLAIM = 20;

export type ClaimListingsResult = {
  claimedCount: number;
  skippedThreshold: boolean;
};

/** Deterministic id so repeated sign-in attempts upsert the same review instead of piling up duplicates. */
function buildReviewDocId(uid: string, verifiedPhone: string): string {
  return `${uid}__${verifiedPhone.replace(/[^a-zA-Z0-9]/g, '')}`;
}

/**
 * Record (or refresh) a pending review for an auto-claim batch that exceeded
 * MAX_AUTO_CLAIM. Never overwrites a review an admin already resolved
 * (approved/rejected) — a fresh sign-in attempt before that resolution just
 * bumps `matchCount`/`lastAttemptAt` on the still-pending review.
 */
async function recordPendingReview(
  db: FirebaseFirestore.Firestore,
  uid: string,
  verifiedPhone: string,
  matchCount: number,
): Promise<void> {
  const ref = db.collection(firebaseCollectionNames.listing_claim_reviews).doc(buildReviewDocId(uid, verifiedPhone));
  const existing = await ref.get();

  if (existing.exists && existing.data()?.status !== 'pending') {
    return;
  }

  await ref.set(
    {
      uid,
      verifiedPhone,
      matchCount,
      status: 'pending',
      lastAttemptAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
}

/**
 * Attach every unclaimed listing whose `contact` matches `verifiedPhone` to
 * `uid`. Idempotent: listings already claimed (by this uid or another) and
 * listings already created by this uid are left untouched.
 */
export async function claimListingsByVerifiedPhone(
  uid: string,
  verifiedPhone: string,
): Promise<ClaimListingsResult> {
  const { adminApp } = await import('@/firebase/admin');
  const db = getFirestore(adminApp as any);

  const snapshot = await db
    .collection(firebaseCollectionNames.properties)
    .where('contact', '==', verifiedPhone)
    .get();

  const candidates = snapshot.docs.filter((doc) => {
    const data = doc.data();
    return data.createdBy !== uid && !data.claimedBy;
  });

  if (candidates.length === 0) {
    return { claimedCount: 0, skippedThreshold: false };
  }

  if (candidates.length > MAX_AUTO_CLAIM) {
    logger.warn('Auto-claim threshold exceeded, skipping (needs manual review)', {
      uid,
      verifiedPhone,
      matchCount: candidates.length,
      threshold: MAX_AUTO_CLAIM,
    });
    try {
      await recordPendingReview(db, uid, verifiedPhone, candidates.length);
    } catch (error) {
      logger.error('Failed to record pending listing-claim review', { uid, verifiedPhone, error });
    }
    return { claimedCount: 0, skippedThreshold: true };
  }

  const batch = db.batch();
  for (const doc of candidates) {
    batch.update(doc.ref, {
      claimedBy: uid,
      claimedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  logger.info('Auto-claimed listings by verified phone', {
    uid,
    verifiedPhone,
    claimedCount: candidates.length,
  });

  return { claimedCount: candidates.length, skippedThreshold: false };
}
