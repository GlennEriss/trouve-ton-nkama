import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";
import {
  getGiftWithdrawalById,
  listGiftWithdrawals as listGiftWithdrawalsRaw,
  patchGiftWithdrawalStatus,
} from "@/modules/gift-withdrawals/infrastructure/gift-withdrawals.repository";
import type {
  GiftWithdrawalListItem,
  GiftWithdrawalStatus,
} from "@/modules/gift-withdrawals/domain/types";

export type WithdrawalDecision = "TRAITE" | "REFUSE";

export type ProcessWithdrawalInput = {
  withdrawalId: string;
  actorUid: string;
  decision: WithdrawalDecision;
  motif?: string;
};

export type ProcessWithdrawalResult = {
  before: GiftWithdrawalListItem;
  after: GiftWithdrawalListItem;
};

// Même règle d'idempotence que reels-moderation : une demande déjà traitée
// (TRAITE ou REFUSE) ne peut pas être re-traitée — le versement mobile money
// est manuel et hors système, le statut n'est qu'un acte de tenue de registre.
export async function processGiftWithdrawal(
  input: ProcessWithdrawalInput,
): Promise<ProcessWithdrawalResult | null> {
  const existing = await getGiftWithdrawalById(input.withdrawalId);
  if (!existing) {
    return null;
  }

  if (existing.statut !== "EN_ATTENTE") {
    throw new Error("WITHDRAWAL_NOT_PENDING");
  }

  await patchGiftWithdrawalStatus(input.withdrawalId, {
    statut: input.decision,
    motifRefus: input.decision === "REFUSE" ? input.motif ?? null : null,
    traitePar: input.actorUid,
  });

  const updated = await getGiftWithdrawalById(input.withdrawalId);
  if (!updated) {
    throw new Error("WITHDRAWAL_UPDATE_FAILED");
  }

  // Notification in-app à l'annonceur (best-effort : un échec ne doit pas
  // faire échouer la décision — le statut du retrait reste la vérité).
  await notifyAnnouncerOfDecision(updated).catch(() => undefined);

  return { before: existing, after: updated };
}

async function notifyAnnouncerOfDecision(withdrawal: GiftWithdrawalListItem): Promise<void> {
  const db = getFirebaseAdminDb();
  const isPaid = withdrawal.statut === "TRAITE";
  await db.collection(COLLECTIONS.notifications).add({
    type: "GIFT",
    title: isPaid ? "Retrait versé 💸" : "Retrait refusé",
    message: isPaid
      ? `Ton retrait de ${withdrawal.netPayoutXaf.toLocaleString("fr-FR")} FCFA a été envoyé sur ton compte ${
          withdrawal.reseau === "AM" ? "Airtel Money" : "Moov Money"
        }.`
      : `Ta demande de retrait a été refusée${withdrawal.motifRefus ? ` : ${withdrawal.motifRefus}` : "."} Le montant a été restitué à ton solde.`,
    isRead: false,
    createdFor: withdrawal.announcerUid,
    actionUrl: "/gifts",
    state: "IN_PROGRESS",
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function listGiftWithdrawals(input: {
  statut?: GiftWithdrawalStatus | null;
  limit: number;
  cursor?: string | null;
}): Promise<{ items: GiftWithdrawalListItem[]; hasMore: boolean; nextCursor: string | null }> {
  const safeLimit = Math.max(1, Math.min(100, input.limit || 20));
  return listGiftWithdrawalsRaw({ statut: input.statut, limit: safeLimit, cursor: input.cursor });
}
