import { NextRequest } from "next/server";

import {
  approveBodySchema,
  handleSearchRequestModerationDecision,
} from "@/modules/search-requests-moderation/presentation/handle-search-request-moderation-decision";

type RouteContext = {
  params: Promise<{ searchRequestId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { searchRequestId } = await context.params;
  return handleSearchRequestModerationDecision(request, searchRequestId, "APPROVE", approveBodySchema);
}
