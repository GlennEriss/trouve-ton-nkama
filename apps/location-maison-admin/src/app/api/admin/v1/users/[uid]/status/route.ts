import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { updatePlatformUserStatus } from "@/modules/user-management/application/user-management.service";

const bodySchema = z
  .object({
    status: z.enum(["active", "suspended"]),
  })
  .strict();

type RouteContext = {
  params: Promise<{ uid: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request);

  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const uid = params.uid?.trim();

  if (!uid) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant utilisateur invalide.",
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

  const requiredPermission =
    parsed.data.status === "suspended" ? "users.suspend" : "users.reactivate";

  if (!hasPermission(auth.admin.permissions, requiredPermission)) {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: `Permission manquante : ${requiredPermission}`,
      },
      403,
      auth.correlationId,
    );
  }

  let updated: Awaited<ReturnType<typeof updatePlatformUserStatus>> | null = null;
  try {
    updated = await updatePlatformUserStatus({
      uid,
      status: parsed.data.status,
      actorUid: auth.admin.uid,
    });
  } catch {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: "Impossible de modifier le statut utilisateur.",
      },
      500,
      auth.correlationId,
    );
  }

  if (!updated) {
    return jsonError(
      {
        code: "NOT_FOUND",
        message: "Utilisateur introuvable.",
      },
      404,
      auth.correlationId,
    );
  }

  await logAudit({
    actorId: auth.admin.uid,
    actorRoles: auth.admin.roles,
    action: requiredPermission,
    resource: "user",
    resourceId: uid,
    status: "success",
    correlationId: auth.correlationId,
    diff: {
      isSuspended: updated.isSuspended,
    },
  });

  return jsonSuccess({ user: updated }, auth.correlationId);
}
