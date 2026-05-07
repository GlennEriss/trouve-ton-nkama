import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { finalizeFinanceRefundExecution } from "@/modules/finance-credits/application/finance-credits.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

type RouteContext = {
  params: Promise<{ refundId: string }>;
};

const bodySchema = z
  .object({
    status: z.enum(["success", "failed"]),
    executionNote: z.string().trim().max(500).optional(),
    externalReference: z.string().trim().max(120).optional(),
    amountRefunded: z.coerce.number().min(0).optional(),
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

  const executionNote = parsed.data.executionNote?.trim();
  const externalReference = parsed.data.externalReference?.trim();

  try {
    const result = await finalizeFinanceRefundExecution({
      refundId,
      nextStatus: parsed.data.status,
      actorUid: auth.admin.uid,
      executionNote,
      externalReference,
      amountRefunded: parsed.data.amountRefunded,
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
      action: "refunds.execute",
      resource: "refund_payment",
      resourceId: refundId,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        previousStatus: result.previousStatus,
        nextStatus: result.nextStatus,
        executionNote: executionNote ?? null,
        externalReference: externalReference ?? null,
        amountRefunded: parsed.data.amountRefunded ?? null,
      },
    });

    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "FINANCE_REFUND_EXECUTION_FAILED";
    const status =
      code === "FINANCE_REFUND_NOT_APPROVED"
        ? 409
        : code === "FINANCE_REFUND_INVALID_AMOUNT" ||
            code === "FINANCE_REFUND_AMOUNT_EXCEEDS_REQUEST" ||
            code === "FINANCE_REFUND_EXECUTION_NOTE_REQUIRED"
          ? 400
          : 500;

    return jsonError(
      {
        code: status === 400 ? "VALIDATION_ERROR" : status === 409 ? "CONFLICT" : "INTERNAL_ERROR",
        message:
          code === "FINANCE_REFUND_NOT_APPROVED"
            ? "Cette demande doit être approuvée avant exécution."
            : code === "FINANCE_REFUND_INVALID_AMOUNT"
              ? "Le montant remboursé est invalide."
              : code === "FINANCE_REFUND_AMOUNT_EXCEEDS_REQUEST"
                ? "Le montant remboursé dépasse le montant demandé."
                : code === "FINANCE_REFUND_EXECUTION_NOTE_REQUIRED"
                  ? "Une note d'exécution est requise pour marquer un échec."
                  : error instanceof Error
                    ? error.message
                    : "Impossible de finaliser l'exécution du remboursement.",
        details: {
          financeErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
