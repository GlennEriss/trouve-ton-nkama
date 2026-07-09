import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import type { ApiErrorCode } from "@/lib/api/types";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { grantCredits } from "@/modules/finance-credits/application/finance-credits.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const bodySchema = z
  .object({
    uid: z.string().trim().min(1),
    credits: z.coerce.number().int().min(1).max(50000),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

function resolveErrorStatus(code: string) {
  if (
    code === "FINANCE_INVALID_CREDITS" ||
    code === "FINANCE_REASON_REQUIRED"
  ) {
    return 400;
  }

  if (code === "FINANCE_USER_NOT_FOUND") {
    return 404;
  }

  if (
    code === "FINANCE_IDEMPOTENCY_IN_PROGRESS" ||
    code === "FINANCE_IDEMPOTENCY_CONFLICT"
  ) {
    return 409;
  }

  return 500;
}

function resolveApiErrorCode(status: number): ApiErrorCode {
  if (status === 400) {
    return "VALIDATION_ERROR";
  }
  if (status === 404) {
    return "NOT_FOUND";
  }
  if (status === 409) {
    return "CONFLICT";
  }
  return "INTERNAL_ERROR";
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "credits.grant");
  if (!auth.ok) {
    return auth.response;
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

  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || null;

  try {
    const result = await grantCredits(
      {
        uid: parsed.data.uid,
        credits: parsed.data.credits,
        reason: parsed.data.reason,
        actorUid: auth.admin.uid,
        actorEmail: auth.admin.email,
        idempotencyKey,
      },
      auth.correlationId,
    );

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "credits.grant",
      resource: "user",
      resourceId: parsed.data.uid,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        creditsGranted: result.creditsGranted,
        previousCredits: result.previousCredits,
        currentCredits: result.currentCredits,
        reason: result.reason,
        transactionId: result.transactionId,
        replayed: result.replayed,
      },
    });

    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "FINANCE_GRANT_FAILED";
    const status = resolveErrorStatus(code);

    return jsonError(
      {
        code: resolveApiErrorCode(status),
        message:
          code === "FINANCE_IDEMPOTENCY_CONFLICT"
            ? "La clé d'idempotence est déjà utilisée avec un payload différent."
            : code === "FINANCE_IDEMPOTENCY_IN_PROGRESS"
              ? "Une requête identique est déjà en cours."
              : code === "FINANCE_USER_NOT_FOUND"
                ? "Utilisateur introuvable."
                : code === "FINANCE_INVALID_CREDITS"
                  ? "Le nombre de crédits doit être supérieur à 0."
                : code === "FINANCE_REASON_REQUIRED"
                    ? "Le motif est obligatoire."
                    : "Impossible d'attribuer les crédits.",
        details: {
          financeErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
