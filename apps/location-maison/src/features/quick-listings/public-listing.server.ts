import 'server-only';
import { getFirestore, Timestamp, FieldPath } from 'firebase-admin/firestore';
import { adminApp } from '@/firebase/admin';
import { toPublicQuickListing } from './public-listing';

export async function getPublicQuickListing(id: string) {
  if (!id || id.length > 128 || id.includes('/') || id === '.' || id === '..') return null;
  const snapshot = await getFirestore(adminApp!).collection('quick_listings').doc(id).get();
  return snapshot.exists ? toPublicQuickListing(snapshot.id, snapshot.data()) : null;
}

export async function listPublicQuickListings(limit: number, cursor?: { seconds: number; nanoseconds: number; id: string }) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('invalid_limit');
  let query = getFirestore(adminApp!).collection('quick_listings')
    .where('paymentStatus', '==', 'confirmed')
    .where('moderationStatus', '==', 'APPROVED')
    .where('state', '==', 'IN_PROGRESS')
    .orderBy('publishedAt', 'desc').orderBy(FieldPath.documentId(), 'desc');
  if (cursor) query = query.startAfter(new Timestamp(cursor.seconds, cursor.nanoseconds), cursor.id);
  const snapshot = await query.limit(limit + 1).get();
  const docs = snapshot.docs.slice(0, limit);
  const last = docs.at(-1);
  const date = last?.get('publishedAt') as Timestamp | undefined;
  return {
    items: docs.flatMap(doc => { const item = toPublicQuickListing(doc.id, doc.data()); return item ? [item] : []; }),
    nextCursor: snapshot.size > limit && last && date ? Buffer.from(JSON.stringify({ seconds: date.seconds, nanoseconds: date.nanoseconds, id: last.id })).toString('base64url') : null,
  };
}
