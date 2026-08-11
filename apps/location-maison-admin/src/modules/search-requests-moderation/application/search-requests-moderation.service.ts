import { Timestamp } from "firebase-admin/firestore";

import {
  getSearchRequestById,
  listPendingSearchRequests as listPendingSearchRequestsRaw,
  patchSearchRequestModerationStatus,
} from "@/modules/search-requests-moderation/infrastructure/search-requests.repository";
import type { SearchRequestListItem } from "@/modules/search-requests-moderation/domain/types";

export type ModerationDecision = "APPROVE" | "REJECT";

export type UpdateSearchRequestModerationStatusInput = {
  searchRequestId: string;
  actorUid: string;
  decision: ModerationDecision;
  reason?: string;
};

export type UpdateSearchRequestModerationStatusResult = {
  before: SearchRequestListItem;
  after: SearchRequestListItem;
};

// Durée dupliquée depuis apps/location-maison/src/constantes/search-requests.ts
// (SEARCH_REQUEST_BOOST_DURATION_DAYS) — même convention de duplication de
// constante par app que gifts.ts/gifts/constants.ts.
const BOOST_DURATION_DAYS = 7;

// Mirror de reels-moderation.service.ts:updateReelModerationStatus — même règle
// d'idempotence (évite qu'un double-clic ne déclenche deux fois la décision).
export async function updateSearchRequestModerationStatus(
  input: UpdateSearchRequestModerationStatusInput,
): Promise<UpdateSearchRequestModerationStatusResult | null> {
  const existing = await getSearchRequestById(input.searchRequestId);
  if (!existing) {
    return null;
  }

  if (existing.moderationStatus !== "PENDING") {
    throw new Error("SEARCH_REQUEST_NOT_PENDING");
  }

  const moderationStatus = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";

  // La fenêtre de boost démarre ICI, à l'approbation — jamais au paiement
  // (webhook), pour que le délai de modération ne rogne pas les 7 jours achetés.
  let boostStartAt: Timestamp | null | undefined;
  let boostEndAt: Timestamp | null | undefined;
  if (input.decision === "APPROVE" && existing.boostPaid) {
    const now = Timestamp.now();
    boostStartAt = now;
    boostEndAt = Timestamp.fromMillis(now.toMillis() + BOOST_DURATION_DAYS * 24 * 60 * 60 * 1000);
  }

  await patchSearchRequestModerationStatus(input.searchRequestId, {
    moderationStatus,
    rejectionReason: input.decision === "REJECT" ? input.reason ?? null : null,
    reviewedBy: input.actorUid,
    boostStartAt,
    boostEndAt,
  });

  const updated = await getSearchRequestById(input.searchRequestId);
  if (!updated) {
    throw new Error("SEARCH_REQUEST_UPDATE_FAILED");
  }

  return { before: existing, after: updated };
}

export async function listPendingSearchRequests(input: {
  limit: number;
  cursor?: string | null;
}): Promise<{ items: SearchRequestListItem[]; hasMore: boolean; nextCursor: string | null }> {
  const safeLimit = Math.max(1, Math.min(100, input.limit || 20));
  return listPendingSearchRequestsRaw({ limit: safeLimit, cursor: input.cursor });
}
