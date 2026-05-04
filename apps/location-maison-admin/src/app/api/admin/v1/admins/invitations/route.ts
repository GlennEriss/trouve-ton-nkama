import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { inviteAdmin } from "@/modules/admin-management/application/admin-management.service";
import { ADMIN_ROLES, isAdminRole } from "@/modules/iam/domain/role-utils";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const schema = z
  .object({
    email: z.string().trim().email(),
    role: z.string().trim(),
    displayName: z.string().trim().max(120).optional().nullable(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "admins.invite");

  if (!auth.ok) {
    return auth.response;
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

  if (!isAdminRole(parsed.data.role)) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Rôle invalide.",
        details: {
          allowedRoles: ADMIN_ROLES,
        },
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const result = await inviteAdmin(
      {
        email: parsed.data.email,
        role: parsed.data.role,
        displayName: parsed.data.displayName ?? null,
      },
      auth.admin,
    );

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "admins.invite",
      resource: "admin_user",
      resourceId: result.admin.uid,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        email: result.admin.email,
        role: parsed.data.role,
        invitationId: result.invitationId,
      },
    });

    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";

    if (code === "ADMIN_ALREADY_ACTIVE") {
      return jsonError(
        {
          code: "CONFLICT",
          message: "Ce compte est déjà actif comme administrateur.",
        },
        409,
        auth.correlationId,
      );
    }

    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: "Impossible d'inviter cet administrateur.",
      },
      500,
      auth.correlationId,
    );
  }
}
