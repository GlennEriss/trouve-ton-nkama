import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";
import { toIsoDate } from "@trouve-ton-nkama/core/utils";
import { resolveCursorSnapshot, sliceCursorPage } from "@/lib/firestore/pagination";
import type {
  GiftWithdrawalListItem,
  GiftWithdrawalRawDoc,
  GiftWithdrawalStatus,
} from "@/modules/gift-withdrawals/domain/types";

const WITHDRAWALS_COLLECTION = COLLECTIONS.gift_withdrawals;

function mapWithdrawal(id: string, data: GiftWithdrawalRawDoc): GiftWithdrawalListItem {
  return {
    id,
    announcerUid: data.announcerUid,
    montantXaf: data.montantXaf ?? 0,
    feeXaf: data.feeXaf ?? 0,
    netPayoutXaf: data.netPayoutXaf ?? 0,
    numero: data.numero ?? "",
    reseau: data.reseau ?? "AM",
    statut: data.statut ?? "EN_ATTENTE",
    traitePar: data.traitePar ?? null,
    motifRefus: data.motifRefus ?? null,
    dateCreation: toIsoDate(data.dateCreation),
    dateMiseAJour: toIsoDate(data.dateMiseAJour),
  };
}

export async function listGiftWithdrawals(input: {
  statut?: GiftWithdrawalStatus | null;
  limit: number;
  cursor?: string | null;
}): Promise<{ items: GiftWithdrawalListItem[]; hasMore: boolean; nextCursor: string | null }> {
  const db = getFirebaseAdminDb();
  const collectionRef = db.collection(WITHDRAWALS_COLLECTION);

  let query = collectionRef.orderBy("dateCreation", "desc").limit(input.limit + 1);
  if (input.statut) {
    query = collectionRef
      .where("statut", "==", input.statut)
      .orderBy("dateCreation", "desc")
      .limit(input.limit + 1);
  }

  const cursorDoc = await resolveCursorSnapshot(collectionRef, input.cursor);
  if (cursorDoc) {
    query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  return sliceCursorPage(snapshot.docs, input.limit, (doc) =>
    mapWithdrawal(doc.id, doc.data() as GiftWithdrawalRawDoc),
  );
}

export async function getGiftWithdrawalById(id: string): Promise<GiftWithdrawalListItem | null> {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(WITHDRAWALS_COLLECTION).doc(id).get();
  if (!snapshot.exists) {
    return null;
  }
  return mapWithdrawal(snapshot.id, snapshot.data() as GiftWithdrawalRawDoc);
}

export async function patchGiftWithdrawalStatus(
  id: string,
  input: {
    statut: "TRAITE" | "REFUSE";
    motifRefus?: string | null;
    traitePar: string;
  },
): Promise<void> {
  const db = getFirebaseAdminDb();
  await db
    .collection(WITHDRAWALS_COLLECTION)
    .doc(id)
    .set(
      {
        statut: input.statut,
        motifRefus: input.statut === "REFUSE" ? input.motifRefus ?? null : null,
        traitePar: input.traitePar,
        dateMiseAJour: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
