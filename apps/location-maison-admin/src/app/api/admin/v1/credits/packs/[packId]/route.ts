import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import {
  deleteFinanceCreditPack,
  updateFinanceCreditPack,
} from "@/modules/finance-credits/application/finance-credits.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const bodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    credits: z.coerce.number().int().min(1).max(1000000).optional(),
    price: z.coerce.number().int().min(0).max(1000000000).optional(),
    savings: z.coerce.number().min(0).max(99.99).nullable().optional(),
    isActive: z.boolean().optional(),
    order: z.coerce.number().int().min(0).max(100000).optional(),
  })
  .strict();

type RouteContext = {
  params: Promise<{ packId: string }>;
};

type PackUsageDetails = {
  transactionId?: string;
  createdAt?: string | null;
  status?: string;
  type?: string;
  matchedField?: string;
};

function resolveUpdatePackError(code: string) {
  if (code === "FINANCE_PACK_INVALID_ID") {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: "Identifiant de pack invalide." };
  }
  if (code === "FINANCE_PACK_EMPTY_PATCH") {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: "Aucune modification demandée." };
  }
  if (
    code === "FINANCE_PACK_INVALID_NAME" ||
    code === "FINANCE_PACK_INVALID_CREDITS" ||
    code === "FINANCE_PACK_INVALID_PRICE"
  ) {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: "Patch pack invalide." };
  }
  return { status: 500, apiCode: "INTERNAL_ERROR" as const, message: "Impossible de mettre à jour ce pack." };
}

function resolveDeletePackError(code: string) {
  if (code === "FINANCE_PACK_INVALID_ID") {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: "Identifiant de pack invalide." };
  }
  if (code === "FINANCE_PACK_IN_USE") {
    return {
      status: 409,
      apiCode: "CONFLICT" as const,
      message: "Suppression impossible: ce pack est déjà utilisé dans des transactions.",
    };
  }
  return { status: 500, apiCode: "INTERNAL_ERROR" as const, message: "Impossible de supprimer ce pack." };
}

function extractPackUsageDetails(error: unknown): PackUsageDetails | null {
  if (!(error instanceof Error)) {
    return null;
  }
  if (!error.cause || typeof error.cause !== "object" || Array.isArray(error.cause)) {
    return null;
  }
  const cause = error.cause as Record<string, unknown>;
  const details: PackUsageDetails = {};

  if (typeof cause.transactionId === "string" && cause.transactionId.trim()) {
    details.transactionId = cause.transactionId.trim();
  }
  if (typeof cause.createdAt === "string" && cause.createdAt.trim()) {
    details.createdAt = cause.createdAt.trim();
  }
  if (typeof cause.status === "string" && cause.status.trim()) {
    details.status = cause.status.trim();
  }
  if (typeof cause.type === "string" && cause.type.trim()) {
    details.type = cause.type.trim();
  }
  if (typeof cause.matchedField === "string" && cause.matchedField.trim()) {
    details.matchedField = cause.matchedField.trim();
  }

  return Object.keys(details).length > 0 ? details : null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "credits.pack_manage");
  if (!auth.ok) {
    return auth.response;
  }

  const { packId } = await context.params;
  if (!packId?.trim()) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant de pack invalide.",
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
    const updated = await updateFinanceCreditPack({
      packId,
      patch: parsed.data,
      actorUid: auth.admin.uid,
    });

    if (!updated) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Pack introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "credits.pack_manage",
      resource: "credit_pack",
      resourceId: updated.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        operation: "update",
        patch: parsed.data,
      },
    });

    return jsonSuccess({ pack: updated }, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveUpdatePackError(code);
    return jsonError(
      {
        code: mapped.apiCode,
        message: mapped.message,
        details: {
          financeErrorCode: code,
        },
      },
      mapped.status,
      auth.correlationId,
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "credits.pack_manage");
  if (!auth.ok) {
    return auth.response;
  }

  const { packId } = await context.params;
  if (!packId?.trim()) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant de pack invalide.",
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const deleted = await deleteFinanceCreditPack(packId);
    if (!deleted) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Pack introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "credits.pack_manage",
      resource: "credit_pack",
      resourceId: deleted.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        operation: "delete",
        pack: deleted,
      },
    });

    return jsonSuccess({ pack: deleted }, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveDeletePackError(code);
    const usage = extractPackUsageDetails(error);

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "credits.pack_manage",
      resource: "credit_pack",
      resourceId: packId.trim(),
      status: "failed",
      correlationId: auth.correlationId,
      diff: {
        operation: "delete",
        financeErrorCode: code,
      },
      details: usage ? { reason: "pack_in_use", packUsage: usage } : { reason: "delete_failed" },
    });

    return jsonError(
      {
        code: mapped.apiCode,
        message: mapped.message,
        details: {
          financeErrorCode: code,
          ...(usage ? { packUsage: usage } : {}),
        },
      },
      mapped.status,
      auth.correlationId,
    );
  }
}
