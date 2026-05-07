import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { reviewFinanceRefund } from "@/modules/finance-credits/application/finance-credits.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

type RouteContext = {
  params: Promise<{ refundId: string }>;
};

const bodySchema = z
  .object({
    status: z.enum(["approved", "rejected"]),
    decisionNote: z.string().trim().max(500).optional(),
  })
  .strict();

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "refunds.approve");
  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const refundId = params.refundId?.trim();
  if (!refundId) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant de remboursement invalide.",
      },
      400,
      auth.correlationId,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps de requête invalide.",
        details: {
          issues: parsed.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const result = await reviewFinanceRefund({
      refundId,
      nextStatus: parsed.data.status,
      actorUid: auth.admin.uid,
      decisionNote: parsed.data.decisionNote,
    });

    if (!result) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Demande de remboursement introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "refunds.approve",
      resource: "refund_payment",
      resourceId: refundId,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        previousStatus: result.previousStatus,
        nextStatus: result.nextStatus,
        decisionNote: parsed.data.decisionNote ?? null,
      },
    });

    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "Impossible de mettre à jour ce remboursement.",
      },
      500,
      auth.correlationId,
    );
  }
}
