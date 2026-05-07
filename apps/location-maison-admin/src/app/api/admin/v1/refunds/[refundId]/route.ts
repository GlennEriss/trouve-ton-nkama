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
    const result = await reviewFinanceRefund(
      {
        refundId,
        nextStatus: parsed.data.status,
        actorUid: auth.admin.uid,
        decisionNote: parsed.data.decisionNote,
      },
      auth.admin.roles,
    );

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
    const code = error instanceof Error ? error.message : "FINANCE_REFUND_REVIEW_FAILED";
    const status =
      code === "FINANCE_REFUND_NOT_PENDING"
        ? 409
        : code === "FINANCE_REFUND_NOTE_REQUIRED"
          ? 400
          : code === "FINANCE_REFUND_SUPER_ADMIN_REQUIRED"
            ? 403
            : 500;

    return jsonError(
      {
        code:
          status === 400
            ? "VALIDATION_ERROR"
            : status === 403
              ? "FORBIDDEN"
              : status === 409
                ? "CONFLICT"
                : "INTERNAL_ERROR",
        message:
          code === "FINANCE_REFUND_NOT_PENDING"
            ? "Cette demande n'est plus en attente."
            : code === "FINANCE_REFUND_NOTE_REQUIRED"
              ? "Un commentaire est requis pour approuver ce montant."
              : code === "FINANCE_REFUND_SUPER_ADMIN_REQUIRED"
                ? "Ce montant doit être approuvé par un super admin."
                : error instanceof Error
                  ? error.message
                  : "Impossible de mettre à jour ce remboursement.",
        details: {
          financeErrorCode: code,
          superAdminThresholdXaf: Number(
            process.env.FINANCE_REFUND_SUPER_ADMIN_THRESHOLD_XAF ?? 100000,
          ),
          decisionNoteThresholdXaf: Number(
            process.env.FINANCE_REFUND_DECISION_NOTE_REQUIRED_THRESHOLD_XAF ?? 25000,
          ),
        },
      },
      status,
      auth.correlationId,
    );
  }
}
