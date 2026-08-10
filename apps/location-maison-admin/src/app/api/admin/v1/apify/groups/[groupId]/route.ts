import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { removeGroupSource, updateGroupSource } from "@/modules/apify/application/facebook-group-source.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const bodySchema = z
  .object({
    url: z.string().trim().min(1).max(500).optional(),
    label: z.string().trim().max(80).nullable().optional(),
  })
  .strict();

type RouteContext = {
  params: Promise<{ groupId: string }>;
};

function resolveUpdateError(code: string) {
  if (code === "GROUP_ALREADY_EXISTS") {
    return { status: 409, apiCode: "CONFLICT" as const, message: "Ce groupe est déjà enregistré." };
  }
  if (
    code === "GROUP_URL_INVALID" ||
    code === "GROUP_INVALID_LABEL" ||
    code === "GROUP_EMPTY_PATCH" ||
    code === "GROUP_INVALID_ID"
  ) {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: "Mise à jour invalide." };
  }
  return { status: 500, apiCode: "INTERNAL_ERROR" as const, message: "Impossible de mettre à jour ce groupe." };
}

function resolveDeleteError(code: string) {
  if (code === "GROUP_INVALID_ID") {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: "Identifiant de groupe invalide." };
  }
  return { status: 500, apiCode: "INTERNAL_ERROR" as const, message: "Impossible de supprimer ce groupe." };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "listings.update");
  if (!auth.ok) {
    return auth.response;
  }

  const { groupId } = await context.params;
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
    const updated = await updateGroupSource({ groupId, patch: parsed.data, actorUid: auth.admin.uid });

    if (!updated) {
      return jsonError({ code: "NOT_FOUND", message: "Groupe introuvable." }, 404, auth.correlationId);
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.update",
      resource: "apify_group_source",
      resourceId: updated.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: { operation: "update", patch: parsed.data },
    });

    return jsonSuccess({ group: updated }, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveUpdateError(code);
    return jsonError(
      { code: mapped.apiCode, message: mapped.message, details: { groupErrorCode: code } },
      mapped.status,
      auth.correlationId,
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "listings.update");
  if (!auth.ok) {
    return auth.response;
  }

  const { groupId } = await context.params;

  try {
    const removed = await removeGroupSource(groupId);
    if (!removed) {
      return jsonError({ code: "NOT_FOUND", message: "Groupe introuvable." }, 404, auth.correlationId);
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.update",
      resource: "apify_group_source",
      resourceId: removed.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: { operation: "delete", group: removed },
    });

    return jsonSuccess({ group: removed }, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveDeleteError(code);
    return jsonError(
      { code: mapped.apiCode, message: mapped.message, details: { groupErrorCode: code } },
      mapped.status,
      auth.correlationId,
    );
  }
}
