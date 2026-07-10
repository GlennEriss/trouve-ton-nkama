import type {
  CollectionReference,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";

/**
 * Résout un curseur de pagination (ID de document) en DocumentSnapshot, pour l'utiliser avec
 * `query.startAfter(snapshot)` — nécessaire dès que le tri (`orderBy`) porte sur un champ autre
 * que l'ID de document, auquel cas `startAfter(idString)` seul ne suffit pas.
 *
 * Remplace le bloc `db.collection(x).doc(cursor).get()` + vérification d'existence, dupliqué
 * dans plusieurs repositories admin (listing, finance-credits, social-import).
 */
export async function resolveCursorSnapshot(
  collectionRef: CollectionReference,
  cursor: string | undefined | null,
): Promise<DocumentSnapshot | null> {
  const trimmed = cursor?.trim();
  if (!trimmed) {
    return null;
  }
  const snapshot = await collectionRef.doc(trimmed).get();
  return snapshot.exists ? snapshot : null;
}

/**
 * Découpe une page de résultats à partir d'un fetch "limit + 1" (technique classique pour
 * savoir s'il y a une page suivante sans requête de comptage séparée) : si on a reçu un
 * document de plus que la limite demandée, il y a une page suivante (`hasMore`), et on le
 * retire du résultat retourné.
 *
 * Remplace le bloc `hasMore = docs.length > limit; docs = hasMore ? slice(0, limit) : docs; ...`
 * dupliqué dans plusieurs repositories admin (listing, finance-credits, platform-user,
 * social-import).
 */
export function sliceCursorPage<T>(
  docs: QueryDocumentSnapshot[],
  limit: number,
  mapItem: (doc: QueryDocumentSnapshot) => T,
  fallbackCursor: string | null = null,
): { items: T[]; hasMore: boolean; nextCursor: string | null } {
  const hasMore = docs.length > limit;
  const pageDocs = hasMore ? docs.slice(0, limit) : docs;
  const items = pageDocs.map(mapItem);
  const nextCursor = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1].id : fallbackCursor;

  return { items, hasMore, nextCursor };
}
