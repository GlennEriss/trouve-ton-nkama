import { NextRequest } from "next/server";

import { jsonSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.ok) {
    return auth.response;
  }

  return jsonSuccess(
    {
      admin: {
        uid: auth.admin.uid,
        email: auth.admin.email,
        displayName: auth.admin.displayName,
        roles: auth.admin.roles,
        permissions: auth.admin.permissions,
      },
    },
    auth.correlationId,
  );
}
