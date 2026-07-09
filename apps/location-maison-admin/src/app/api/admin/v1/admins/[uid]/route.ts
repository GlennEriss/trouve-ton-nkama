import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { revokeAdminAccess } from "@/modules/admin-management/application/admin-management.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

type RouteContext = {
  params: Promise<{ uid: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "admins.revoke");

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

  try {
    const updated = await revokeAdminAccess(uid, auth.admin);

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "admins.revoke",
      resource: "admin_user",
      resourceId: uid,
      status: "success",
      correlationId: auth.correlationId,
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

    if (code === "SELF_REVOKE_FORBIDDEN") {
      return jsonError(
        {
          code: "FORBIDDEN",
          message: "Vous ne pouvez pas révoquer votre propre accès.",
        },
        403,
        auth.correlationId,
      );
    }

    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: "Impossible de révoquer cet accès administrateur.",
      },
      500,
      auth.correlationId,
    );
  }
}
