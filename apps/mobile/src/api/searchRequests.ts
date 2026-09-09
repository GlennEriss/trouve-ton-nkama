import { getFirestore, collection, query, where, orderBy, limit, getDocs } from '@react-native-firebase/firestore';
import { apiFetch } from './client';

// Lecture directe Firestore (comme le web, voir search-request.db.ts : "il n'y a pas de
// createSearchRequest [côté lecture], la lecture est publique") — pas besoin de passer par
// le backend Next.js pour ça, contrairement à la recherche Algolia.
export type SearchRequestListItem = {
  id: string;
  typeProperty: string;
  transactionType: 'FOR_RENT' | 'FOR_SALE';
  province: string;
  city: string;
  neighborhood?: string | null;
  budgetMinXaf: number;
  budgetMaxXaf: number;
  description: string;
  whatsappContact: string;
  secondaryContact?: string | null;
};

export async function listSearchRequests(): Promise<SearchRequestListItem[]> {
  const db = getFirestore();
  const q = query(
    collection(db, 'search_requests'),
    where('state', '==', 'IN_PROGRESS'),
    where('moderationStatus', '==', 'APPROVED'),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<SearchRequestListItem, 'id'>) }));
}

export type CreateSearchRequestInput = {
  typeProperty: string;
  transactionType: 'FOR_RENT' | 'FOR_SALE';
  province: string;
  city: string;
  neighborhood?: string;
  budgetMinXaf: number;
  budgetMaxXaf: number;
  description: string;
  whatsappContact: string;
  secondaryContact?: string;
};

// Passe par le backend (authentifié, voir /api/search-requests/mobile-create) — gratuit
// depuis l'app pendant la V1, contrairement au flux web payant via MyPayGa. En attente de
// modération admin avant d'apparaître dans listSearchRequests() ci-dessus.
export async function createSearchRequest(input: CreateSearchRequestInput): Promise<{ success: boolean; id: string }> {
  return apiFetch('/api/search-requests/mobile-create', { method: 'POST', body: input });
}
