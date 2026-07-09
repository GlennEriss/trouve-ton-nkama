import { NextRequest } from "next/server";

import { jsonError } from "@/lib/api/response";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

export async function POST(request: NextRequest) {
  const auth = await requireSocialImportPermission(request, "social_import.run.prod");
  if (!auth.ok) {
    return auth.response;
  }

  return jsonError(
    {
      code: "VALIDATION_ERROR",
      message:
        "Le lancement d'import social est désactivé. Utilise uniquement l'import JSON depuis /dashboard/social-import.",
    },
    410,
    auth.correlationId,
  );
}
