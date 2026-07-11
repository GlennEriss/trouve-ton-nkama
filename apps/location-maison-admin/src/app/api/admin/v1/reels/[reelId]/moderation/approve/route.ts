import { NextRequest } from "next/server";

import {
  approveBodySchema,
  handleReelModerationDecision,
} from "@/modules/reels-moderation/presentation/handle-reel-moderation-decision";

type RouteContext = {
  params: Promise<{ reelId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { reelId } = await context.params;
  return handleReelModerationDecision(request, reelId, "APPROVE", approveBodySchema);
}
