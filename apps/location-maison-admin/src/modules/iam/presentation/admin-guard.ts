import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { jsonError } from "@/lib/api/response";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { ADMIN_SESSION_COOKIE_NAME } from "@/modules/iam/domain/session";
import type { AdminPermission, AuthenticatedAdmin } from "@/modules/iam/domain/types";
import { resolveAdminFromSessionCookie } from "@/modules/iam/application/admin-auth.service";

type GuardSuccess = {
  ok: true;
  admin: AuthenticatedAdmin;
  correlationId: string;
};

type GuardFailure = {
  ok: false;
  response: ReturnType<typeof jsonError>;
};

export async function requireAdmin(
  request: NextRequest,
  permission?: AdminPermission,
): Promise<GuardSuccess | GuardFailure> {
  const correlationId =
    request.headers.get("x-correlation-id")?.trim() || randomUUID();

  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return {
      ok: false,
      response: jsonError(
        {
          code: "UNAUTHENTICATED",
          message: "Session administrateur absente.",
        },
        401,
        correlationId,
      ),
    };
  }

  let admin: AuthenticatedAdmin;

  try {
    admin = await resolveAdminFromSessionCookie(sessionCookie);
  } catch {
    return {
      ok: false,
      response: jsonError(
        {
          code: "UNAUTHENTICATED",
          message: "Session administrateur invalide ou expirée.",
        },
        401,
        correlationId,
      ),
    };
  }

  if (permission && !hasPermission(admin.permissions, permission)) {
    return {
      ok: false,
      response: jsonError(
        {
          code: "FORBIDDEN",
          message: `Permission manquante : ${permission}`,
        },
        403,
        correlationId,
      ),
    };
  }

  return {
    ok: true,
    admin,
    correlationId,
  };
}
