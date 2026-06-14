import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { publishCampaign } from "@/modules/advertising/application/advertising.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "ads_campaigns.publish");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const campaign = await publishCampaign(id);

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "ads_campaigns.publish",
      resource: "ad_campaign",
      resourceId: id,
      status: "success",
      correlationId: auth.correlationId,
      diff: { operation: "publish", status: campaign.status },
    });

    return jsonSuccess({ campaign }, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    if (code === "AD_CAMPAIGN_NOT_FOUND") {
      return jsonError({ code: "NOT_FOUND", message: "Campagne introuvable." }, 404, auth.correlationId);
    }
    if (code === "AD_CAMPAIGN_ALREADY_ENDED") {
      return jsonError({ code: "VALIDATION_ERROR", message: "La campagne est déjà terminée." }, 400, auth.correlationId);
    }
    return jsonError(
      { code: "INTERNAL_ERROR", message: "Impossible de publier la campagne.", details: { advertisingErrorCode: code } },
      500,
      auth.correlationId,
    );
  }
}
