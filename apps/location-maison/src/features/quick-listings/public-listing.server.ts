import 'server-only';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/firebase/admin';
import { toPublicQuickListing } from './public-listing';

export async function getPublicQuickListing(id: string) {
  if (!id || id.length > 128 || id.includes('/') || id === '.' || id === '..') return null;
  const snapshot = await getFirestore(adminApp!).collection('quick_listings').doc(id).get();
  return snapshot.exists ? toPublicQuickListing(snapshot.id, snapshot.data()) : null;
}
