import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import {
  createFinanceCreditPack,
  listFinanceCreditPacks,
} from "@/modules/finance-credits/application/finance-credits.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const bodySchema = z
  .object({
    id: z.string().trim().min(2).max(80),
    name: z.string().trim().min(2).max(120),
    credits: z.coerce.number().int().min(1).max(1000000),
    price: z.coerce.number().int().min(0).max(1000000000),
    savings: z.coerce.number().min(0).max(99.99).optional().nullable(),
    isActive: z.boolean().optional(),
    order: z.coerce.number().int().min(0).max(100000).optional(),
  })
  .strict();

function resolveCreatePackError(code: string) {
  if (code === "FINANCE_PACK_ALREADY_EXISTS") {
    return {
      status: 409,
      apiCode: "CONFLICT" as const,
      message: "Un pack avec cet identifiant existe déjà.",
    };
  }
  if (
    code === "FINANCE_PACK_INVALID_ID" ||
    code === "FINANCE_PACK_INVALID_NAME" ||
    code === "FINANCE_PACK_INVALID_CREDITS" ||
    code === "FINANCE_PACK_INVALID_PRICE"
  ) {
    return {
      status: 400,
      apiCode: "VALIDATION_ERROR" as const,
      message: "Données de pack invalides.",
    };
  }
  return {
    status: 500,
    apiCode: "INTERNAL_ERROR" as const,
    message: "Impossible de créer ce pack.",
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "credits.read");
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await listFinanceCreditPacks();
    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de charger les packs crédits.",
      },
      500,
      auth.correlationId,
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "credits.pack_manage");
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

  try {
    const created = await createFinanceCreditPack({
      ...parsed.data,
      actorUid: auth.admin.uid,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "credits.pack_manage",
      resource: "credit_pack",
      resourceId: created.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        operation: "create",
        pack: created,
      },
    });

    return jsonSuccess({ pack: created }, auth.correlationId, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveCreatePackError(code);
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
