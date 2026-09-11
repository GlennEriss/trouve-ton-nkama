import { getFirestore, collection, query, where, getDocs } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

// Lecture directe Firestore (properties: `allow read: if true`, voir firestore.rules) — pas
// besoin de passer par /api/announcer/ads (session NextAuth par cookie, inutilisable depuis
// le mobile qui n'a qu'un token Firebase). Deux requêtes (créateur + co-gestion par
// revendication) fusionnées, même modèle que ownsReferencedProperty() dans firestore.rules.
export type MyListingItem = {
  id: string;
  title: string;
  price: number;
  typeProperty: string;
  status: 'FOR_RENT' | 'FOR_SALE';
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  state: 'IN_PROGRESS' | 'ARCHIVED';
  city: string;
  // Zones multiples (Mode, etc.) — voir docs/marketplace-multi-categories/
  // 08-zones-multiples-mode.md. Absent sur l'immobilier et sur une annonce Mode créée avant
  // ce champ (repli sur `city` géré par formatListingZones, lib/listingZones.ts).
  cities?: string[];
};

function moderationLabel(status: MyListingItem['moderationStatus']): string {
  if (status === 'APPROVED') return 'Publiée';
  if (status === 'REJECTED') return 'Rejetée';
  return 'En attente de modération';
}

export { moderationLabel };

export async function listMyListings(): Promise<MyListingItem[]> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return [];

  const db = getFirestore();
  const propertiesRef = collection(db, 'properties');

  const [byCreator, byClaim] = await Promise.all([
    getDocs(query(propertiesRef, where('createdBy', '==', uid))),
    getDocs(query(propertiesRef, where('claimedBy', '==', uid))),
  ]);

  const byId = new Map<string, MyListingItem>();
  for (const doc of [...byCreator.docs, ...byClaim.docs]) {
    byId.set(doc.id, { id: doc.id, ...(doc.data() as Omit<MyListingItem, 'id'>) });
  }
  return Array.from(byId.values());
}
