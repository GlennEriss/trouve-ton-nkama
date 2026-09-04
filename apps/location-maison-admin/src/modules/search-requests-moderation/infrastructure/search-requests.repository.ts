import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";
import { toIsoDate } from "@trouve-ton-nkama/core/utils";
import { resolveCursorSnapshot, sliceCursorPage } from "@/lib/firestore/pagination";
import type { SearchRequestListItem, SearchRequestRawDoc } from "@/modules/search-requests-moderation/domain/types";

const SEARCH_REQUESTS_COLLECTION = COLLECTIONS.search_requests;

function mapSearchRequest(id: string, data: SearchRequestRawDoc): SearchRequestListItem {
  return {
    id,
    typeProperty: data.typeProperty,
    transactionType: data.transactionType,
    province: data.province,
    city: data.city,
    neighborhood: data.neighborhood ?? null,
    budgetMinXaf: data.budgetMinXaf,
    budgetMaxXaf: data.budgetMaxXaf,
    description: data.description,
    whatsappContact: data.whatsappContact,
    paymentStatus: data.paymentStatus,
    amountPaidXaf: data.amountPaidXaf,
    boostRequested: data.boostRequested,
    boostPaid: data.boostPaid,
    boostStartAt: toIsoDate(data.boostStartAt),
    boostEndAt: toIsoDate(data.boostEndAt),
    moderationStatus: data.moderationStatus,
    rejectionReason: data.rejectionReason ?? null,
    // Documents créés avant l'ajout de ces champs : valeurs par défaut sûres.
    state: data.state ?? "IN_PROGRESS",
    source: data.source ?? "public",
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
  };
}

export async function listPendingSearchRequests(input: {
  limit: number;
  cursor?: string | null;
}): Promise<{ items: SearchRequestListItem[]; hasMore: boolean; nextCursor: string | null }> {
  const db = getFirebaseAdminDb();
  const collectionRef = db.collection(SEARCH_REQUESTS_COLLECTION);

  let query = collectionRef
    .where("moderationStatus", "==", "PENDING")
    .orderBy("createdAt", "asc")
    .limit(input.limit + 1);

  const cursorDoc = await resolveCursorSnapshot(collectionRef, input.cursor);
  if (cursorDoc) {
    query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  return sliceCursorPage(snapshot.docs, input.limit, (doc) =>
    mapSearchRequest(doc.id, doc.data() as SearchRequestRawDoc),
  );
}

export async function getSearchRequestById(searchRequestId: string): Promise<SearchRequestListItem | null> {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(SEARCH_REQUESTS_COLLECTION).doc(searchRequestId).get();
  if (!snapshot.exists) {
    return null;
  }
  return mapSearchRequest(snapshot.id, snapshot.data() as SearchRequestRawDoc);
}

export async function patchSearchRequestModerationStatus(
  searchRequestId: string,
  input: {
    moderationStatus: "APPROVED" | "REJECTED";
    rejectionReason?: string | null;
    reviewedBy: string;
    // Fenêtre de boost calculée par le service appelant (uniquement si
    // moderationStatus === 'APPROVED' && boostPaid) — la fenêtre démarre à
    // l'approbation, jamais au paiement, pour ne pas pénaliser le payeur si la
    // modération est lente.
    boostStartAt?: Timestamp | null;
    boostEndAt?: Timestamp | null;
  },
): Promise<void> {
  const db = getFirebaseAdminDb();
  await db
    .collection(SEARCH_REQUESTS_COLLECTION)
    .doc(searchRequestId)
    .set(
      {
        moderationStatus: input.moderationStatus,
        rejectionReason: input.moderationStatus === "REJECTED" ? input.rejectionReason ?? null : null,
        moderationReviewedAt: FieldValue.serverTimestamp(),
        moderationReviewedBy: input.reviewedBy,
        ...(input.boostStartAt !== undefined ? { boostStartAt: input.boostStartAt } : {}),
        ...(input.boostEndAt !== undefined ? { boostEndAt: input.boostEndAt } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

/**
 * Demandes déjà approuvées, filtrées par état de publication.
 *
 * `IN_PROGRESS` = visible sur le site public ; `ARCHIVED` = retirée du public
 * mais conservée. C'est la liste que l'admin gère après modération, distincte de
 * la file d'attente (qui, elle, ne montre que les PENDING).
 */
export async function listApprovedSearchRequests(input: {
  limit: number;
  cursor?: string | null;
  state: "IN_PROGRESS" | "ARCHIVED";
}): Promise<{ items: SearchRequestListItem[]; hasMore: boolean; nextCursor: string | null }> {
  const db = getFirebaseAdminDb();
  const collectionRef = db.collection(SEARCH_REQUESTS_COLLECTION);

  let query = collectionRef
    .where("moderationStatus", "==", "APPROVED")
    .where("state", "==", input.state)
    .orderBy("createdAt", "desc")
    .limit(input.limit + 1);

  const cursorDoc = await resolveCursorSnapshot(collectionRef, input.cursor);
  if (cursorDoc) {
    query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  return sliceCursorPage(snapshot.docs, input.limit, (doc) =>
    mapSearchRequest(doc.id, doc.data() as SearchRequestRawDoc),
  );
}

/** Bascule publication ↔ archive. Réversible, aucune donnée n'est perdue. */
export async function setSearchRequestState(
  searchRequestId: string,
  state: "IN_PROGRESS" | "ARCHIVED",
  actorUid: string,
): Promise<void> {
  const db = getFirebaseAdminDb();
  await db
    .collection(SEARCH_REQUESTS_COLLECTION)
    .doc(searchRequestId)
    .set(
      {
        state,
        stateUpdatedAt: FieldValue.serverTimestamp(),
        stateUpdatedBy: actorUid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

/** Suppression définitive du document. Irréversible. */
export async function deleteSearchRequest(searchRequestId: string): Promise<void> {
  const db = getFirebaseAdminDb();
  await db.collection(SEARCH_REQUESTS_COLLECTION).doc(searchRequestId).delete();
}

export type SearchRequestContentPatch = {
  typeProperty: string;
  transactionType: "FOR_RENT" | "FOR_SALE";
  province: string;
  city: string;
  neighborhood: string | null;
  budgetMinXaf: number;
  budgetMaxXaf: number;
  description: string;
  whatsappContact: string;
};

/**
 * Correction du contenu d'une demande (erreur de saisie, budget mal interprété, etc.) —
 * distincte de `patchSearchRequestModerationStatus` (décision d'approbation) et de
 * `setSearchRequestState` (publier/archiver) : ne touche à aucun des deux, disponible que
 * la demande soit encore en attente ou déjà publiée.
 */
export async function updateSearchRequestContent(
  searchRequestId: string,
  content: SearchRequestContentPatch,
  actorUid: string,
): Promise<void> {
  const db = getFirebaseAdminDb();
  await db
    .collection(SEARCH_REQUESTS_COLLECTION)
    .doc(searchRequestId)
    .set(
      {
        ...content,
        contentEditedAt: FieldValue.serverTimestamp(),
        contentEditedBy: actorUid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
