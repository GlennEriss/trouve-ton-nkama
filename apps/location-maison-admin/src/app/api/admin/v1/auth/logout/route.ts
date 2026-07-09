import { NextRequest } from "next/server";

import { jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { ADMIN_SESSION_COOKIE_NAME } from "@/modules/iam/domain/session";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  const correlationId = auth.ok ? auth.correlationId : undefined;

  const response = jsonSuccess({ loggedOut: true }, correlationId);

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0),
  });

  if (auth.ok) {
    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "auth.session.delete",
      resource: "admin_session",
      status: "success",
      correlationId: auth.correlationId,
    });
  }

  return response;
}
