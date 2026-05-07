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
