import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { recordPayment } from "@/modules/advertising/application/advertising.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const bodySchema = z
  .object({
    amount: z.coerce.number().int().min(1).max(1000000000),
    currency: z.literal("XAF").optional(),
    paymentMethod: z.string().trim().min(2).max(60),
    paymentReference: z.string().trim().max(120).optional(),
  })
  .strict();

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "ads_campaigns.payment");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: "Corps de requête invalide.", details: { issues: parsed.error.issues } },
      400,
      auth.correlationId,
    );
  }

  try {
    const campaign = await recordPayment({ id, ...parsed.data, actorUid: auth.admin.uid });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "ads_campaigns.payment",
      resource: "ad_campaign",
      resourceId: id,
      status: "success",
      correlationId: auth.correlationId,
      diff: { operation: "record_payment", amount: parsed.data.amount, method: parsed.data.paymentMethod },
    });

    return jsonSuccess({ campaign }, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    if (code === "AD_CAMPAIGN_NOT_FOUND") {
      return jsonError({ code: "NOT_FOUND", message: "Campagne introuvable." }, 404, auth.correlationId);
    }
    const isValidation = code.startsWith("AD_PAYMENT_");
    return jsonError(
      { code: isValidation ? "VALIDATION_ERROR" : "INTERNAL_ERROR", message: "Impossible d'enregistrer le paiement.", details: { advertisingErrorCode: code } },
      isValidation ? 400 : 500,
      auth.correlationId,
    );
  }
}
