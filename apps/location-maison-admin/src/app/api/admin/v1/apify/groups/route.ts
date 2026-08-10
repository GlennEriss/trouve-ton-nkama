import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { createGroupSource, listGroupSources } from "@/modules/apify/application/facebook-group-source.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const bodySchema = z
  .object({
    url: z.string().trim().min(1).max(500),
    label: z.string().trim().max(80).optional(),
  })
  .strict();

function resolveCreateError(code: string) {
  if (code === "GROUP_ALREADY_EXISTS") {
    return { status: 409, apiCode: "CONFLICT" as const, message: "Ce groupe est déjà enregistré." };
  }
  if (code === "GROUP_URL_INVALID" || code === "GROUP_INVALID_LABEL") {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: "URL de groupe invalide." };
  }
  return { status: 500, apiCode: "INTERNAL_ERROR" as const, message: "Impossible d'enregistrer ce groupe." };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.read");
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await listGroupSources();
    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Impossible de charger les groupes." },
      500,
      auth.correlationId,
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.update");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: "Corps de requête invalide.", details: { issues: parsed.error.issues } },
      400,
      auth.correlationId,
    );
  }

  try {
    const created = await createGroupSource({ ...parsed.data, actorUid: auth.admin.uid });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.update",
      resource: "apify_group_source",
      resourceId: created.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: { operation: "create", group: created },
    });

    return jsonSuccess({ group: created }, auth.correlationId, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveCreateError(code);
    return jsonError(
      { code: mapped.apiCode, message: mapped.message, details: { groupErrorCode: code } },
      mapped.status,
      auth.correlationId,
    );
  }
}
