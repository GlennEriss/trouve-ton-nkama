import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { removeTag, updateTag } from "@/modules/tag-management/application/tag-management.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const bodySchema = z
  .object({
    name: z.string().trim().min(2).max(50).optional(),
    isActive: z.boolean().optional(),
    order: z.coerce.number().int().min(0).max(100000).optional(),
  })
  .strict();

type RouteContext = {
  params: Promise<{ tagId: string }>;
};

function resolveUpdateError(code: string) {
  if (code === "TAG_ALREADY_EXISTS") {
    return { status: 409, apiCode: "CONFLICT" as const, message: "Ce tag existe déjà." };
  }
  if (code === "TAG_INVALID_NAME" || code === "TAG_INVALID_ORDER" || code === "TAG_EMPTY_PATCH" || code === "TAG_INVALID_ID") {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: "Mise à jour invalide." };
  }
  return { status: 500, apiCode: "INTERNAL_ERROR" as const, message: "Impossible de mettre à jour ce tag." };
}

function resolveDeleteError(code: string) {
  if (code === "TAG_INVALID_ID") {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: "Identifiant de tag invalide." };
  }
  return { status: 500, apiCode: "INTERNAL_ERROR" as const, message: "Impossible de supprimer ce tag." };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "listings.update");
  if (!auth.ok) {
    return auth.response;
  }

  const { tagId } = await context.params;
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
    const updated = await updateTag({
      tagId,
      patch: parsed.data,
      actorUid: auth.admin.uid,
    });

    if (!updated) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Tag introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.update",
      resource: "listing_tag",
      resourceId: updated.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        operation: "update",
        patch: parsed.data,
      },
    });

    return jsonSuccess({ tag: updated }, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveUpdateError(code);
    return jsonError(
      {
        code: mapped.apiCode,
        message: mapped.message,
        details: {
          tagErrorCode: code,
        },
      },
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

  const { tagId } = await context.params;

  try {
    const removed = await removeTag(tagId);
    if (!removed) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Tag introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.update",
      resource: "listing_tag",
      resourceId: removed.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        operation: "delete",
        tag: removed,
      },
    });

    return jsonSuccess({ tag: removed }, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveDeleteError(code);
    return jsonError(
      {
        code: mapped.apiCode,
        message: mapped.message,
        details: {
          tagErrorCode: code,
        },
      },
      mapped.status,
      auth.correlationId,
    );
  }
}
