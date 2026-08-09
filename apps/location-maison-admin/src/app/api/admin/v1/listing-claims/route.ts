import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { listPendingListingClaimReviews } from "@/modules/listing-claim-review/application/listing-claim-review.service";

/**
 * Pending announcer auto-attribution batches blocked by MAX_AUTO_CLAIM,
 * awaiting an admin decision (approve/reject).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.read");
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const reviews = await listPendingListingClaimReviews();
    return jsonSuccess({ reviews }, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de charger les revues d'attribution.",
      },
      500,
      auth.correlationId,
    );
  }
}
