import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import {
  createAdminSessionFromIdToken,
} from "@/modules/iam/application/admin-auth.service";
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "@/modules/iam/domain/session";

const schema = z.object({
  idToken: z.string().min(10),
});

export async function POST(request: NextRequest) {
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
    );
  }

  try {
    const result = await createAdminSessionFromIdToken(parsed.data.idToken);
    const response = jsonSuccess({
      admin: result.admin,
    });

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE_NAME,
      value: result.sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });

    await logAudit({
      actorId: result.admin.uid,
      actorRoles: result.admin.roles,
      action: "auth.session.create",
      resource: "admin_session",
      status: "success",
      correlationId: response.headers.get("x-correlation-id") ?? "n/a",
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";

    if (message === "ADMIN_NOT_FOUND") {
      return jsonError(
        {
          code: "FORBIDDEN",
          message: "Ce compte n'est pas autorisé comme administrateur.",
        },
        403,
      );
    }

    if (message === "ADMIN_INACTIVE") {
      return jsonError(
        {
          code: "FORBIDDEN",
          message: "Le compte administrateur n'est pas actif.",
        },
        403,
      );
    }

    return jsonError(
      {
        code: "UNAUTHENTICATED",
        message: "Impossible de créer la session administrateur.",
      },
      401,
    );
  }
}
