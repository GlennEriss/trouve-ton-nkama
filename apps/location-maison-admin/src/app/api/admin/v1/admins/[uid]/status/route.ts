import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { changeAdminStatus } from "@/modules/admin-management/application/admin-management.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const schema = z
  .object({
    status: z.enum(["active", "suspended", "revoked"]),
  })
  .strict();

type RouteContext = {
  params: Promise<{ uid: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "admins.suspend");

  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const uid = params.uid?.trim();

  if (!uid) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant admin invalide.",
      },
      400,
      auth.correlationId,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

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
    const updated = await changeAdminStatus(
      {
        uid,
        status: parsed.data.status,
      },
      auth.admin,
    );

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "admins.update_status",
      resource: "admin_user",
      resourceId: uid,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        status: updated.status,
      },
    });

    return jsonSuccess({ admin: updated }, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";

    if (code === "ADMIN_NOT_FOUND") {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Administrateur introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    if (code === "SELF_STATUS_CHANGE_FORBIDDEN") {
      return jsonError(
        {
          code: "FORBIDDEN",
          message: "Vous ne pouvez pas modifier ce statut sur votre propre compte.",
        },
        403,
        auth.correlationId,
      );
    }

    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: "Impossible de mettre à jour le statut.",
      },
      500,
      auth.correlationId,
    );
  }
}
