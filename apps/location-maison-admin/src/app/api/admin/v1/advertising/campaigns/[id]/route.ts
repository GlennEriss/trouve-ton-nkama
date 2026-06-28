import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import {
  getCampaign,
  updateCampaign,
} from "@/modules/advertising/application/advertising.service";
import { AD_PLACEMENTS } from "@/modules/advertising/domain/types";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const placementEnum = z.enum(AD_PLACEMENTS as [string, ...string[]]);

const assetSchema = z
  .object({
    imagePATH: z.string().trim().max(500).optional(),
    imageURL: z.string().trim().url().max(1000),
  })
  .strict();

const patchSchema = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    creative: z
      .object({
        imagePATH: z.string().trim().max(500).optional(),
        imageURL: z.string().trim().url().max(1000),
        assets: z
          .object({
            home: assetSchema.optional(),
            search_infeed: assetSchema.optional(),
            immobilier_infeed: assetSchema.optional(),
            property_detail: assetSchema.optional(),
          })
          .strict()
          .optional(),
        headline: z.string().trim().max(120).optional(),
        body: z.string().trim().max(300).optional(),
        ctaLabel: z.string().trim().max(40).optional(),
        ctaUrl: z.string().trim().max(1000).optional(),
      })
      .strict()
      .optional(),
    placements: z.array(placementEnum).min(1).max(4).optional(),
    targeting: z
      .object({
        provinces: z.array(z.string().trim()).optional(),
        cities: z.array(z.string().trim()).optional(),
      })
      .strict()
      .nullable()
      .optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    priority: z.coerce.number().int().min(0).max(1000).optional(),
    status: z.enum(["draft", "pending_review", "scheduled", "active", "paused", "ended", "rejected"]).optional(),
  })
  .strict();

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "ads_campaigns.read");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const campaign = await getCampaign(id);
    if (!campaign) {
      return jsonError({ code: "NOT_FOUND", message: "Campagne introuvable." }, 404, auth.correlationId);
    }
    return jsonSuccess({ campaign }, auth.correlationId);
  } catch (error) {
    return jsonError(
      { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Erreur." },
      500,
      auth.correlationId,
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "ads_campaigns.update");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: "Corps de requête invalide.", details: { issues: parsed.error.issues } },
      400,
      auth.correlationId,
    );
  }

  try {
    const updated = await updateCampaign({
      id,
      ...parsed.data,
      placements: parsed.data.placements as never,
      actorUid: auth.admin.uid,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "ads_campaigns.update",
      resource: "ad_campaign",
      resourceId: id,
      status: "success",
      correlationId: auth.correlationId,
      diff: { operation: "update", patch: parsed.data },
    });

    return jsonSuccess({ campaign: updated }, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    if (code === "AD_CAMPAIGN_NOT_FOUND") {
      return jsonError({ code: "NOT_FOUND", message: "Campagne introuvable." }, 404, auth.correlationId);
    }
    const isValidation = code.startsWith("AD_CAMPAIGN_");
    return jsonError(
      { code: isValidation ? "VALIDATION_ERROR" : "INTERNAL_ERROR", message: "Impossible de modifier la campagne.", details: { advertisingErrorCode: code } },
      isValidation ? 400 : 500,
      auth.correlationId,
    );
  }
}
