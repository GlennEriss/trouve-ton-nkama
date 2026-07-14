import { NextRequest } from "next/server";

import {
  handleWithdrawalDecision,
  markPaidBodySchema,
} from "@/modules/gift-withdrawals/presentation/handle-withdrawal-decision";

type RouteContext = {
  params: Promise<{ withdrawalId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { withdrawalId } = await context.params;
  return handleWithdrawalDecision(request, withdrawalId, "TRAITE", markPaidBodySchema);
}
