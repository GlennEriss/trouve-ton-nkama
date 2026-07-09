import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { changeAdminRoles } from "@/modules/admin-management/application/admin-management.service";
import { isAdminRole } from "@/modules/iam/domain/role-utils";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const schema = z
  .object({
    roles: z.array(z.string().trim()).min(1).max(3),
  })
  .strict();

type RouteContext = {
  params: Promise<{ uid: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "admins.update_role");

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

  const hasInvalidRole = parsed.data.roles.some((role) => !isAdminRole(role));
  if (hasInvalidRole) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Au moins un rôle est invalide.",
      },
      400,
      auth.correlationId,
    );
  }

  const roles = parsed.data.roles.filter(isAdminRole);

  try {
    const updated = await changeAdminRoles(
      {
        uid,
        roles,
      },
      auth.admin,
    );

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "admins.update_role",
      resource: "admin_user",
      resourceId: uid,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        roles: updated.roles,
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

    if (code === "SELF_ROLE_CHANGE_FORBIDDEN") {
      return jsonError(
        {
          code: "FORBIDDEN",
          message: "Vous ne pouvez pas modifier vos propres rôles.",
        },
        403,
        auth.correlationId,
      );
    }

    if (code === "INVALID_ROLE_SET") {
      return jsonError(
        {
          code: "VALIDATION_ERROR",
          message: "La liste des rôles est invalide.",
        },
        400,
        auth.correlationId,
      );
    }

    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: "Impossible de mettre à jour les rôles.",
      },
      500,
      auth.correlationId,
    );
  }
}
