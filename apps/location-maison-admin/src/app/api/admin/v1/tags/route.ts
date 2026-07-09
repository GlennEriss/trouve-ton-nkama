import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { createTag, listTags } from "@/modules/tag-management/application/tag-management.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const bodySchema = z
  .object({
    name: z.string().trim().min(2).max(50),
    isActive: z.boolean().optional(),
    order: z.coerce.number().int().min(0).max(100000).optional(),
  })
  .strict();

function resolveCreateError(code: string) {
  if (code === "TAG_ALREADY_EXISTS") {
    return {
      status: 409,
      apiCode: "CONFLICT" as const,
      message: "Ce tag existe déjà.",
    };
  }
  if (code === "TAG_INVALID_NAME" || code === "TAG_INVALID_ORDER") {
    return {
      status: 400,
      apiCode: "VALIDATION_ERROR" as const,
      message: "Données de tag invalides.",
    };
  }
  return {
    status: 500,
    apiCode: "INTERNAL_ERROR" as const,
    message: "Impossible de créer ce tag.",
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.read");
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await listTags();
    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de charger les tags.",
      },
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
    const created = await createTag({
      ...parsed.data,
      actorUid: auth.admin.uid,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.update",
      resource: "listing_tag",
      resourceId: created.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        operation: "create",
        tag: created,
      },
    });

    return jsonSuccess({ tag: created }, auth.correlationId, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveCreateError(code);
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
