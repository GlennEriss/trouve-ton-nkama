import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import {
  createCampaign,
  listCampaigns,
} from "@/modules/advertising/application/advertising.service";
import { AD_PLACEMENTS } from "@/modules/advertising/domain/types";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const placementEnum = z.enum(
  AD_PLACEMENTS as [string, ...string[]],
);

const assetSchema = z
  .object({
    imagePATH: z.string().trim().max(500).optional(),
    imageURL: z.string().trim().url().max(1000),
  })
  .strict();

const creativeSchema = z
  .object({
    imagePATH: z.string().trim().max(500).optional(),
    imageURL: z.string().trim().url().max(1000),
    // Visuels adaptés par emplacement (optionnel).
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
  .strict();

const createSchema = z
  .object({
    advertiserId: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? null : value),
      z.string().trim().min(1).nullable().optional(),
    ),
    title: z.string().trim().min(2).max(160),
    creative: creativeSchema,
    placements: z.array(placementEnum).min(1).max(4),
    targeting: z
      .object({
        provinces: z.array(z.string().trim()).optional(),
        cities: z.array(z.string().trim()).optional(),
      })
      .strict()
      .nullable()
      .optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    priority: z.coerce.number().int().min(0).max(1000).optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "ads_campaigns.read");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  try {
    const result = await listCampaigns({
      status: (searchParams.get("status") as never) ?? "all",
      placement: (searchParams.get("placement") as never) ?? "all",
      advertiserId: searchParams.get("advertiserId") ?? undefined,
    });
    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de charger les campagnes.",
      },
      500,
      auth.correlationId,
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "ads_campaigns.create");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: "Corps de requête invalide.", details: { issues: parsed.error.issues } },
      400,
      auth.correlationId,
    );
  }

  try {
    const created = await createCampaign({
      ...parsed.data,
      creative: parsed.data.creative,
      placements: parsed.data.placements as never,
      actorUid: auth.admin.uid,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "ads_campaigns.create",
      resource: "ad_campaign",
      resourceId: created.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: { operation: "create", campaign: created },
    });

    return jsonSuccess({ campaign: created }, auth.correlationId, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const isValidation = code.startsWith("AD_CAMPAIGN_") || code.startsWith("ADVERTISER_");
    return jsonError(
      { code: isValidation ? "VALIDATION_ERROR" : "INTERNAL_ERROR", message: "Impossible de créer la campagne.", details: { advertisingErrorCode: code } },
      isValidation ? 400 : 500,
      auth.correlationId,
    );
  }
}
