import type { NextRequest } from "next/server";

import { jsonError } from "@/lib/api/response";
import { hasPermission } from "@/modules/iam/domain/permissions";
import type { AdminPermission, AuthenticatedAdmin } from "@/modules/iam/domain/types";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

type SocialImportGuardSuccess = {
  ok: true;
  admin: AuthenticatedAdmin;
  correlationId: string;
};

type SocialImportGuardFailure = {
  ok: false;
  response: ReturnType<typeof jsonError>;
};

export async function requireSocialImportPermission(
  request: NextRequest,
  permission: AdminPermission,
): Promise<SocialImportGuardSuccess | SocialImportGuardFailure> {
  const auth = await requireAdmin(request, "social_import.read");
  if (!auth.ok) {
    return auth;
  }

  if (!hasPermission(auth.admin.permissions, permission)) {
    return {
      ok: false,
      response: jsonError(
        {
          code: "FORBIDDEN",
          message: `Permission manquante : ${permission}`,
        },
        403,
        auth.correlationId,
      ),
    };
  }

  return auth;
}
