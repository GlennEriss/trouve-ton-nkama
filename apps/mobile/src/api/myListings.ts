import { getFirestore, collection, query, where, getDocs, doc, updateDoc, deleteDoc } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import type { PropertyImage } from '../lib/propertyImage';

// Lecture directe Firestore (properties: `allow read: if true`, voir firestore.rules) — pas
// besoin de passer par /api/announcer/ads (session NextAuth par cookie, inutilisable depuis
// le mobile qui n'a qu'un token Firebase). Deux requêtes (créateur + co-gestion par
// revendication) fusionnées, même modèle que ownsReferencedProperty() dans firestore.rules.
//
// Champs étendus pour AdManagementPage.tsx (web, /property) — voir MyListingsScreen.tsx :
// contrairement au web (routes API en SDK admin), le mobile a une vraie session Firebase Auth
// client, donc lit/écrit directement `properties` sous les mêmes règles que ownsReferencedProperty
// (createdBy OU claimedBy + isAnnouncer(), voir firestore.rules).
export type MyListingItem = {
  id: string;
  title: string;
  price: number;
  area?: number;
  // Absent sur une annonce Mode (categoryId présent à la place) — voir la note juste plus bas
  // sur le discriminant `!typeProperty`.
  typeProperty?: string;
  status: 'FOR_RENT' | 'FOR_SALE';
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  state: 'IN_PROGRESS' | 'ARCHIVED';
  city: string;
  province?: string;
  street?: string;
  // Zones multiples (Mode, etc.) — voir docs/marketplace-multi-categories/
  // 08-zones-multiples-mode.md. Absent sur l'immobilier et sur une annonce Mode créée avant
  // ce champ (repli sur `city` géré par formatListingZones, lib/listingZones.ts).
  cities?: string[];
  images?: PropertyImage[];
  // Absent sur l'immobilier (typeProperty présent) — présent sur Mode (categoryId), voir
  // resolveScope() côté web (AdManagementPage.tsx) : `!typeProperty` est le seul discriminant
  // fiable, categoryId seul a été posé par erreur sur ~949/950 annonces (backfill 2026-08-17).
  categoryId?: string;
  categoryPath?: { lvl0?: string; lvl1?: string };
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  claimedBy?: string;
  isPromoted?: boolean;
};

function moderationLabel(status: MyListingItem['moderationStatus']): string {
  if (status === 'APPROVED') return 'Publiée';
  if (status === 'REJECTED') return 'Rejetée';
  return 'En attente de validation';
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
  for (const item of [...byCreator.docs, ...byClaim.docs]) {
    byId.set(item.id, { id: item.id, ...(item.data() as Omit<MyListingItem, 'id'>) });
  }
  return Array.from(byId.values());
}

// Archiver/Réactiver (AdManagementPage.tsx, toggleAdState) : la patch ne doit JAMAIS inclure
// moderationStatus — la règle Firestore `allow update` (properties) exige qu'il reste inchangé
// (sauf REJECTED -> PENDING, un cas qui ne passe pas par ce chemin), sinon l'écriture est
// silencieusement rejetée (permission-denied).
export async function setListingState(id: string, nextState: MyListingItem['state']): Promise<void> {
  await updateDoc(doc(getFirestore(), 'properties', id), {
    state: nextState,
    updatedAt: new Date(),
  });
}

export async function deleteListing(id: string): Promise<void> {
  await deleteDoc(doc(getFirestore(), 'properties', id));
}
