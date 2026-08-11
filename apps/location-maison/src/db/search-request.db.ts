import firebaseCollectionNames from "@/constantes/firebase-collection-name";
import { SearchRequest } from "@/models/search-request";
import { TypePropertyKey } from "@trouve-ton-nkama/core/domain";
import { createLogger } from '@/lib/logger';

const logger = createLogger('db.search-request');

const getFirestore = () => import("@/firebase/firestore");

// Lecture publique uniquement : contrairement à property.db.ts, il n'y a pas de
// createSearchRequest ici. La création est anonyme et liée 1:1 à un paiement
// MyPayGa, donc elle vit uniquement dans la Cloud Function
// initiateSearchRequestPayment (Admin SDK) — même logique que gift_transactions,
// qui n'a pas non plus de chemin de création côté client.

export async function getSearchRequests({
    limitPerPage,
    lastDoc,
    typeProperty,
    transactionType,
    city,
}: {
    limitPerPage: number;
    lastDoc: any;
    typeProperty?: TypePropertyKey;
    transactionType?: 'FOR_RENT' | 'FOR_SALE';
    city?: string;
}) {
    const { collection, doc, getDoc, getDocs, db, where, query, startAfter, limit, orderBy } = await getFirestore();
    const searchRequestsRef = collection(db, firebaseCollectionNames.search_requests);
    let q = query(
        searchRequestsRef,
        where('state', '==', 'IN_PROGRESS'),
        where('moderationStatus', '==', 'APPROVED'),
        orderBy('createdAt', 'desc'),
    );
    if (typeProperty) {
        q = query(q, where('typeProperty', '==', typeProperty));
    }
    if (transactionType) {
        q = query(q, where('transactionType', '==', transactionType));
    }
    if (city) {
        q = query(q, where('city', '==', city));
    }
    if (limitPerPage > 0) {
        q = query(q, limit(limitPerPage));
    }

    let cursor = lastDoc;
    if (typeof cursor === 'string') {
        const cursorSnapshot = await getDoc(doc(db, firebaseCollectionNames.search_requests, cursor));
        cursor = cursorSnapshot.exists() ? cursorSnapshot : null;
    }
    if (cursor) {
        q = query(q, startAfter(cursor));
    }

    const querySnapshot = await getDocs(q);
    const searchRequests: SearchRequest[] = [];
    if (querySnapshot.docs.length < limitPerPage) {
        lastDoc = null;
    } else {
        const nextCursor = querySnapshot.docs[querySnapshot.docs.length - 1];
        const nextQuery = query(q, startAfter(nextCursor), limit(1));
        const nextQuerySnapshot = await getDocs(nextQuery);
        lastDoc = nextQuerySnapshot.docs.length === 0 ? null : nextCursor.id;
    }
    querySnapshot.forEach((docSnap: any) => {
        searchRequests.push({ ...docSnap.data(), id: docSnap.id } as SearchRequest);
    });

    return {
        searchRequests,
        limitPerPage,
        lastDoc,
    };
}

/**
 * Demandes actuellement boostées, triées par début de boost le plus récent.
 * Requête séparée de getSearchRequests (même logique que
 * api/property/promoted/route.ts pour les annonces) — évite un index composite
 * boostEndAt+moderationStatus+createdAt sur la requête liste principale, la
 * page publique affiche cette section en tête puis le flux normal en dessous.
 */
export async function getBoostedSearchRequests(limitCount = 10): Promise<SearchRequest[]> {
    try {
        const { collection, getDocs, db, where, query, orderBy, limit, Timestamp } = await getFirestore();
        const searchRequestsRef = collection(db, firebaseCollectionNames.search_requests);
        const q = query(
            searchRequestsRef,
            where('state', '==', 'IN_PROGRESS'),
            where('moderationStatus', '==', 'APPROVED'),
            where('boostEndAt', '>', Timestamp.now()),
            orderBy('boostEndAt', 'desc'),
            limit(limitCount),
        );
        const querySnapshot = await getDocs(q);
        const boosted: SearchRequest[] = [];
        querySnapshot.forEach((docSnap: any) => {
            boosted.push({ ...docSnap.data(), id: docSnap.id } as SearchRequest);
        });
        return boosted;
    } catch (error) {
        logger.error('Error fetching boosted search requests', { error });
        return [];
    }
}

export async function getSearchRequestById(id: string): Promise<SearchRequest | null> {
    try {
        const { doc, getDoc, db } = await getFirestore();
        const docRef = doc(db, firebaseCollectionNames.search_requests, id);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) {
            return null;
        }
        return { ...snapshot.data(), id: snapshot.id } as SearchRequest;
    } catch (error) {
        logger.error('Error fetching search request by ID', { id, error });
        throw new Error(`Failed to fetch search request with ID ${id}: ${error}`);
    }
}
