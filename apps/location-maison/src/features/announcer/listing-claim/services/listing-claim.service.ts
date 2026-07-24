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
 * wrong account, so a batch above MAX_AUTO_CLAIM is skipped entirely and
 * logged for manual follow-up instead of partially/fully applied.
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
