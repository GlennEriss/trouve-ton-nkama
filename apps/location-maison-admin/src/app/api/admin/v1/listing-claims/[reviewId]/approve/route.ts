import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import {
  approveListingClaimReview,
  ListingClaimReviewError,
} from "@/modules/listing-claim-review/application/listing-claim-review.service";

type RouteContext = {
  params: Promise<{ reviewId: string }>;
};

/** Approve: attach the matching listings to the announcer, bypassing MAX_AUTO_CLAIM. */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "listings.update");
  if (!auth.ok) {
    return auth.response;
  }

  const { reviewId } = await context.params;

  try {
    const result = await approveListingClaimReview(reviewId, auth.admin.uid);
    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    if (error instanceof ListingClaimReviewError) {
      const notFound = error.code === "REVIEW_NOT_FOUND";
      return jsonError(
        { code: notFound ? "NOT_FOUND" : "CONFLICT", message: error.message },
        notFound ? 404 : 409,
        auth.correlationId,
      );
    }
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible d'approuver cette revue.",
      },
      500,
      auth.correlationId,
    );
  }
}
