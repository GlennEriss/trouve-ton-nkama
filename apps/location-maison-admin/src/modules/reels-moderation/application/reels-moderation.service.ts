import {
  getReelById,
  listPendingReels as listPendingReelsRaw,
  patchReelModerationStatus,
} from "@/modules/reels-moderation/infrastructure/reels.repository";
import type { ReelListItem } from "@/modules/reels-moderation/domain/types";

export type ModerationDecision = "APPROVE" | "REJECT";

export type UpdateReelModerationStatusInput = {
  reelId: string;
  actorUid: string;
  decision: ModerationDecision;
  reason?: string;
};

export type UpdateReelModerationStatusResult = {
  before: ReelListItem;
  after: ReelListItem;
};

// Mirror de listing-management.service.ts:updateListingModerationStatus — même règle
// d'idempotence (évite qu'un double-clic ne déclenche deux fois la décision).
export async function updateReelModerationStatus(
  input: UpdateReelModerationStatusInput,
): Promise<UpdateReelModerationStatusResult | null> {
  const existing = await getReelById(input.reelId);
  if (!existing) {
    return null;
  }

  if (existing.moderationStatus !== "PENDING") {
    throw new Error("REEL_NOT_PENDING");
  }

  if (existing.processingStatus !== "ready") {
    throw new Error("REEL_NOT_READY");
  }

  const moderationStatus = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
  await patchReelModerationStatus(input.reelId, {
    moderationStatus,
    rejectionReason: input.decision === "REJECT" ? input.reason ?? null : null,
    reviewedBy: input.actorUid,
  });

  const updated = await getReelById(input.reelId);
  if (!updated) {
    throw new Error("REEL_UPDATE_FAILED");
  }

  return { before: existing, after: updated };
}

export async function listPendingReels(input: {
  limit: number;
  cursor?: string | null;
}): Promise<{ items: ReelListItem[]; hasMore: boolean; nextCursor: string | null }> {
  const safeLimit = Math.max(1, Math.min(100, input.limit || 20));
  return listPendingReelsRaw({ limit: safeLimit, cursor: input.cursor });
}
